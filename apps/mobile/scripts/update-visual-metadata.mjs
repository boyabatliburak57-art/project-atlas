import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const profileDirectory = resolve(
  import.meta.dirname,
  '../src/test/visual/current/iphone-17-ios-26.5',
);
const files = readdirSync(profileDirectory)
  .filter((file) => file.endsWith('.png'))
  .sort();
const hashes = Object.fromEntries(
  files.map((file) => [
    file,
    createHash('sha256')
      .update(readFileSync(resolve(profileDirectory, file)))
      .digest('hex'),
  ]),
);
const sourceCommit = process.env.SOURCE_COMMIT?.trim() || 'WORKTREE';

const metadata = {
  device: 'iPhone 17',
  os: 'iOS 26.5',
  orientation: 'portrait',
  locale: 'tr-TR',
  timezone: 'Europe/Istanbul',
  themes: ['light', 'dark'],
  fontScales: ['system-default', 'accessibility-extra-large'],
  reducedMotion: [
    'enabled-task100k-captures',
    'enabled-task110e-captures',
    'mixed-existing-reviewed-baselines',
  ],
  fixture: 'DEMO_UI_FIXTURE_NO_USER_OR_FINANCIAL_DATA_v6',
  fixedClock: '2026-08-08T12:00:00+03:00',
  native: true,
  sourceCommit,
  simulatorUdid: '14D95876-46F5-42E2-87D6-E19514DACFD1',
  screenshotCount: files.length,
  hashAlgorithm: 'sha256',
  hashes,
};

writeFileSync(
  resolve(profileDirectory, 'metadata.json'),
  `${JSON.stringify(metadata, null, 2)}\n`,
);
process.stdout.write(
  `Updated metadata for ${files.length} native screenshots.\n`,
);
