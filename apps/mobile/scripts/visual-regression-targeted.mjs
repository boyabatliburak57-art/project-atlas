import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const profile = 'iphone-17-ios-26.5';
const root = resolve(import.meta.dirname, '../src/test/visual');
const baseline = resolve(root, 'baselines', profile);
const current = resolve(root, 'current', profile);
const files = [
  '205-market-structure-overview-light.png',
  '206-market-structure-overview-dark.png',
  '207-active-measures-light.png',
  '208-measure-detail-light.png',
  '209-measure-history-light.png',
  '210-short-selling-light.png',
  '211-market-structure-provider-required-light.png',
  '212-symbol-market-structure-summary-light.png',
];

const digest = (path) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

function metadata(directory) {
  const path = resolve(directory, 'metadata.json');
  const previous = existsSync(path)
    ? JSON.parse(readFileSync(path, 'utf8'))
    : {};
  const screenshots = readdirSync(directory)
    .filter((file) => file.endsWith('.png'))
    .sort();
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        ...previous,
        device: 'iPhone 17',
        os: 'iOS 26.5',
        locale: 'tr-TR',
        timezone: 'Europe/Istanbul',
        native: true,
        sourceCommit: process.env.SOURCE_COMMIT?.trim() || 'WORKTREE',
        screenshotCount: screenshots.length,
        hashAlgorithm: 'sha256',
        hashes: Object.fromEntries(
          screenshots.map((file) => [file, digest(resolve(directory, file))]),
        ),
      },
      null,
      2,
    )}\n`,
  );
}

for (const file of files)
  if (!existsSync(resolve(current, file)))
    throw new Error(`Targeted candidate missing: ${file}`);

if (process.argv.includes('--update')) {
  if (process.env['ATLAS_UPDATE_VISUAL_BASELINES'] !== '1')
    throw new Error('Targeted baseline update requires explicit approval env');
  for (const file of files)
    copyFileSync(resolve(current, file), resolve(baseline, file));
  metadata(current);
  metadata(baseline);
  process.stdout.write(
    `Targeted baseline update: ${files.length} reviewed files.\n`,
  );
  process.exit(0);
}

for (const file of files) {
  const expected = resolve(baseline, file);
  if (!existsSync(expected))
    throw new Error(`Targeted baseline missing: ${file}`);
  if (digest(expected) !== digest(resolve(current, file)))
    throw new Error(`Targeted visual difference: ${file}`);
}

process.stdout.write(
  `Targeted native visual diff PASS: ${files.length}/${files.length}, 0 differences, baseline mutation 0.\n`,
);
