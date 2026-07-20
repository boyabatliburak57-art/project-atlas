import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const [environment, webImage, apiImage, workerImage, migrationImage, output] =
  process.argv.slice(2);
if (!['production', 'staging'].includes(environment))
  fail('invalid environment');
const images = { apiImage, migrationImage, webImage, workerImage };
for (const [name, image] of Object.entries(images)) {
  if (!/^[^\s]+@sha256:[a-f0-9]{64}$/u.test(image ?? '')) {
    fail(`${name} must use an immutable sha256 digest`);
  }
}
if (output === undefined || output === '') fail('output path is required');

const overlay = path.join('deploy/kubernetes/overlays', environment);
let manifest = execFileSync('kubectl', ['kustomize', overlay], {
  encoding: 'utf8',
});
manifest = manifest
  .replaceAll('ghcr.io/project-atlas/web@sha256:' + '0'.repeat(64), webImage)
  .replaceAll('ghcr.io/project-atlas/api@sha256:' + '0'.repeat(64), apiImage)
  .replaceAll(
    'ghcr.io/project-atlas/worker@sha256:' + '0'.repeat(64),
    workerImage,
  )
  .replaceAll(
    'ghcr.io/project-atlas/migration@sha256:' + '0'.repeat(64),
    migrationImage,
  );
if (
  manifest.includes('sha256:' + '0'.repeat(64)) ||
  manifest.includes(':latest')
) {
  fail('rendered release contains a mutable or placeholder image');
}
await writeFile(output, manifest, 'utf8');
process.stdout.write(`Rendered ${environment} release to ${output}.\n`);

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
