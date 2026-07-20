import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

const requiredWorkerRoles = [
  'market-data',
  'scanner',
  'alert',
  'notification',
  'backtest',
  'experiment',
  'scheduled',
];
const dockerfile = await readFile('Dockerfile', 'utf8');
const errors = [];
for (const target of ['web', 'api', 'worker', 'migration']) {
  if (!dockerfile.includes(` AS ${target}`))
    errors.push(`missing image target ${target}`);
}
for (const value of [
  'USER node',
  'HEALTHCHECK',
  'org.opencontainers.image.version',
  'org.opencontainers.image.revision',
  'org.opencontainers.image.created',
  'org.opencontainers.image.source',
  'STOPSIGNAL SIGTERM',
  'pnpm install --prod --frozen-lockfile',
]) {
  if (!dockerfile.includes(value))
    errors.push(`Dockerfile is missing ${value}`);
}

for (const environment of ['staging', 'production']) {
  const manifest = execFileSync(
    'kubectl',
    ['kustomize', `deploy/kubernetes/overlays/${environment}`],
    { encoding: 'utf8' },
  );
  for (const role of requiredWorkerRoles) {
    if (!manifest.includes(`value: ${role}`))
      errors.push(`${environment} missing ${role}`);
  }
  for (const path of ['/health/live', '/health/ready', '/health/startup']) {
    if (!manifest.includes(`path: ${path}`))
      errors.push(`${environment} missing ${path}`);
  }
  if (!manifest.includes('runAsNonRoot: true'))
    errors.push(`${environment} permits root`);
  if (
    manifest.includes('hostPath:') ||
    manifest.includes('PersistentVolumeClaim')
  ) {
    errors.push(
      `${environment} workload declares persistent container storage`,
    );
  }
}

for (const workflow of [
  '.github/workflows/production-pr.yml',
  '.github/workflows/staging-release.yml',
  '.github/workflows/production-release.yml',
]) {
  try {
    await readFile(workflow, 'utf8');
  } catch {
    errors.push(`missing workflow ${workflow}`);
  }
}

if (errors.length > 0) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Production artifact validation passed.\n');
}
