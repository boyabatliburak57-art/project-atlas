import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

const [image, releaseId, output] = process.argv.slice(2);
if (!/^[^\s]+@sha256:[a-f0-9]{64}$/u.test(image ?? '')) {
  fail('migration image must use an immutable sha256 digest');
}
if (!/^[a-z0-9-]{7,40}$/u.test(releaseId ?? '')) fail('invalid release id');
if (output === undefined || output === '') fail('output path is required');

let manifest = await readFile(
  'deploy/kubernetes/base/migration-job.yaml',
  'utf8',
);
manifest = manifest
  .replace('atlas-migration-template', `atlas-migration-${releaseId}`)
  .replace('ghcr.io/project-atlas/migration@sha256:' + '0'.repeat(64), image)
  .replace('suspend: true', 'suspend: false');
await writeFile(output, manifest, 'utf8');

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
