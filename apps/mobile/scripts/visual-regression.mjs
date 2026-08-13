import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import process from 'node:process';

const visualRoot = resolve(import.meta.dirname, '../src/test/visual');
const profile = 'iphone-17-ios-26.5';
const baselineDir = resolve(visualRoot, 'baselines', profile);
const candidateDir = resolve(visualRoot, 'current', profile);
const requiredScreenshotCount = 168;

function pngFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((file) => file.endsWith('.png'))
    .sort();
}

function validateCapture(directory, label) {
  const files = pngFiles(directory);
  if (files.length < requiredScreenshotCount)
    throw new Error(
      `${label} requires ${requiredScreenshotCount} native PNGs; found ${files.length}`,
    );
  const metadataPath = resolve(directory, 'metadata.json');
  if (!existsSync(metadataPath))
    throw new Error(`${label} metadata.json missing`);
  const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
  if (
    metadata.device !== 'iPhone 17' ||
    metadata.os !== 'iOS 26.5' ||
    metadata.locale !== 'tr-TR' ||
    metadata.timezone !== 'Europe/Istanbul' ||
    metadata.native !== true
  )
    throw new Error(`${label} metadata does not match the mobile v1 profile`);
  if (
    metadata.screenshotCount !== files.length ||
    metadata.hashAlgorithm !== 'sha256' ||
    files.some(
      (file) => metadata.hashes?.[file] !== digest(resolve(directory, file)),
    )
  )
    throw new Error(`${label} screenshot metadata or hashes are incomplete`);
  return files;
}

function digest(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

if (process.argv.includes('--update')) {
  if (process.env['ATLAS_UPDATE_VISUAL_BASELINES'] !== '1')
    throw new Error('Visual updates require ATLAS_UPDATE_VISUAL_BASELINES=1');
  validateCapture(candidateDir, 'Candidate capture');
  rmSync(baselineDir, { force: true, recursive: true });
  mkdirSync(baselineDir, { recursive: true });
  cpSync(candidateDir, baselineDir, { recursive: true });
  process.stdout.write(`Updated reviewed native baseline for ${profile}.\n`);
  process.exit(0);
}

const baselineFiles = validateCapture(baselineDir, 'Baseline');
const candidateFiles = validateCapture(candidateDir, 'Candidate capture');
if (baselineFiles.join('\n') !== candidateFiles.join('\n'))
  throw new Error('Missing or unexpected native screenshot names');
const differences = baselineFiles.filter(
  (file) =>
    digest(resolve(baselineDir, file)) !== digest(resolve(candidateDir, file)),
);
if (differences.length)
  throw new Error(`Native visual differences: ${differences.join(', ')}`);
process.stdout.write(
  `Native visual diff PASS: ${candidateFiles.length} screenshots, 0 differences.\n`,
);
