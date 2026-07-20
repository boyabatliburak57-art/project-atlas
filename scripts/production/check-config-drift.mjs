import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const contract = JSON.parse(
  await readFile(path.join(root, 'config/runtime-environment.json'), 'utf8'),
);
const examples = await Promise.all(
  contract.environments.map(async (environment) => ({
    environment,
    keys: parseEnvironmentKeys(
      await readFile(
        path.join(root, `config/environments/${environment}.env.example`),
        'utf8',
      ),
    ),
  })),
);

const allRequired = new Set(
  Object.values(contract.roles).flatMap((role) => role.required),
);
const errors = [];
for (const example of examples) {
  for (const key of allRequired) {
    if (!example.keys.has(key)) {
      errors.push(`${example.environment}.env.example is missing ${key}`);
    }
  }
}

const apiSource = await readFile(
  path.join(root, 'apps/api/src/config/environment.ts'),
  'utf8',
);
const workerSource = await readFile(
  path.join(root, 'apps/worker/src/config/environment.ts'),
  'utf8',
);
for (const key of contract.roles.api.required) {
  if (!apiSource.includes(key)) errors.push(`API schema is missing ${key}`);
}
for (const key of contract.roles.worker.required) {
  if (!workerSource.includes(key))
    errors.push(`Worker schema is missing ${key}`);
}

if (errors.length > 0) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Configuration drift validation passed (schema ${contract.schemaVersion}, ${allRequired.size} keys).\n`,
  );
}

function parseEnvironmentKeys(content) {
  return new Set(
    content
      .split(/\r?\n/u)
      .filter((line) => /^[A-Z][A-Z0-9_]*=/u.test(line))
      .map((line) => line.slice(0, line.indexOf('='))),
  );
}
