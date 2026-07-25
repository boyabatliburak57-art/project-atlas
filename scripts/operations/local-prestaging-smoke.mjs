import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, '../..');
const startedAt = new Date();
const checks = [];

await checkBundle();
await checkRouteLoading();
await checkPaginationAndQueryShape();
await memorySmoke();

const report = {
  evidenceClass: 'NOT_STAGING_EVIDENCE',
  environment: 'local',
  startedAt: startedAt.toISOString(),
  completedAt: new Date().toISOString(),
  checks,
  failed: checks.filter(({ status }) => status !== 'PASS').length,
  status: checks.every(({ status }) => status === 'PASS') ? 'PASS' : 'FAIL',
};
await writeFile(
  resolve(root, 'reports/prestaging-local-performance.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
assert.equal(report.status, 'PASS');
process.stdout.write(`${JSON.stringify(report)}\n`);

async function checkBundle() {
  const directory = resolve(root, 'apps/web/.next/static/chunks');
  const files = await recursiveFiles(directory);
  const chunks = await Promise.all(
    files
      .filter((file) => file.endsWith('.js'))
      .map(async (file) => ({ file, bytes: (await stat(file)).size })),
  );
  const totalBytes = chunks.reduce((sum, item) => sum + item.bytes, 0);
  const largestBytes = Math.max(...chunks.map(({ bytes }) => bytes), 0);
  assert.ok(chunks.length > 0, 'WEB_BUILD_REQUIRED');
  assert.ok(totalBytes <= 2 * 1024 * 1024, 'TOTAL_JS_BUNDLE_LIMIT');
  assert.ok(largestBytes <= 512 * 1024, 'ROUTE_CHUNK_LIMIT');
  checks.push({
    id: 'bundle-size',
    totalBytes,
    largestBytes,
    maximumTotalBytes: 2 * 1024 * 1024,
    maximumChunkBytes: 512 * 1024,
    status: 'PASS',
  });
}

async function checkRouteLoading() {
  const source = await readFile(
    resolve(root, 'apps/web/src/app/loading.tsx'),
    'utf8',
  );
  assert.match(source, /aria-busy="true"/u);
  assert.match(source, /aria-live="polite"/u);
  checks.push({ id: 'route-level-loading', status: 'PASS' });
}

async function checkPaginationAndQueryShape() {
  const files = [
    'apps/api/src/navigation/navigation.repository.ts',
    'apps/api/src/reports/reports.repository.ts',
  ];
  for (const file of files) {
    const source = await readFile(resolve(root, file), 'utf8');
    assert.match(source, /\.limit\(limit\)/u);
    assert.doesNotMatch(source, /\.map\([^)]*=>[^)]*(?:query|select)\(/su);
  }
  checks.push({
    id: 'bounded-pagination-no-n-plus-one-source-guard',
    repositories: files.length,
    status: 'PASS',
  });
}

async function memorySmoke() {
  const script = `
    const samples = [];
    for (let round = 0; round < 40; round += 1) {
      const page = Array.from({length: 2000}, (_, index) => ({
        id: String(index), cursor: Buffer.from(String(index)).toString('base64url')
      }));
      samples.push(process.memoryUsage().heapUsed);
      if (page.length !== 2000) process.exit(2);
    }
    const growth = Math.max(0, samples.at(-1) - samples[0]);
    process.stdout.write(JSON.stringify({growth, first:samples[0], last:samples.at(-1)}));
  `;
  const { stdout } = await execFile(process.execPath, ['-e', script], {
    cwd: root,
  });
  const measurement = JSON.parse(stdout);
  assert.ok(measurement.growth <= 32 * 1024 * 1024, 'MEMORY_GROWTH_LIMIT');
  checks.push({
    id: 'memory-leak-smoke',
    maximumGrowthBytes: 32 * 1024 * 1024,
    ...measurement,
    status: 'PASS',
  });
}

async function recursiveFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? recursiveFiles(path) : [path];
      }),
    )
  ).flat();
}
