import { access, constants } from 'node:fs/promises';

async function main(): Promise<void> {
  const healthFile = process.env['WORKER_HEALTH_FILE'];
  if (healthFile === undefined || healthFile === '') {
    throw new Error('WORKER_HEALTH_FILE is required');
  }
  await access(healthFile, constants.R_OK);
}

void main().catch(() => {
  process.exitCode = 1;
});
