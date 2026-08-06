import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const required = [
  'app/_layout.tsx',
  'app/index.tsx',
  'app/(auth)/index.tsx',
  'app/(onboarding)/index.tsx',
  'app/(tabs)/home.tsx',
  'app/(tabs)/markets.tsx',
  'app/(tabs)/search.tsx',
  'app/(tabs)/portfolio.tsx',
  'app/(tabs)/more.tsx',
  '.maestro/smoke.yaml',
];
for (const path of required) {
  if (!existsSync(resolve(root, path)))
    throw new Error(`Missing smoke route: ${path}`);
}
const flow = readFileSync(resolve(root, '.maestro/smoke.yaml'), 'utf8');
for (const label of [
  'Atlas mobile foundation',
  'Continue to foundation',
  'Home foundation',
]) {
  if (!flow.includes(label))
    throw new Error(`Smoke flow missing assertion: ${label}`);
}
process.stdout.write(
  'Mobile E2E smoke contract passed; simulator execution remains a separate environment gate.\n',
);
