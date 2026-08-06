import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
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
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();

const metadata = {
  device: 'iPhone 17',
  os: 'iOS 26.5',
  orientation: 'portrait',
  locale: 'tr-TR',
  timezone: 'Europe/Istanbul',
  themes: ['light', 'dark'],
  fontScales: ['system-default', 'accessibility-extra-large'],
  reducedMotion: true,
  fixture: 'DEMO_UI_FIXTURE_NOT_LIVE_MARKET_DATA_v3',
  fixedClock: '2026-08-06T12:00:00+03:00',
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
