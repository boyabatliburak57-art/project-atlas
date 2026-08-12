import { describe, expect, it } from 'vitest';
import {
  MAX_SENSITIVE_REPORT_BYTES,
  validateDownloadDescriptor,
  validateDownloadedMetadata,
} from './file-policy';

describe('native report file policy', () => {
  const descriptor = {
    ownerId: 'owner-123',
    url: 'https://download.atlas.example/report/signed',
    mimeType: 'application/pdf' as const,
    expiresAt: 1_000,
  };
  it('requires a live HTTPS owner-scoped descriptor', () => {
    expect(() => validateDownloadDescriptor(descriptor, 999)).not.toThrow();
    expect(() =>
      validateDownloadDescriptor(
        { ...descriptor, url: 'http://download.test/x' },
        999,
      ),
    ).toThrow();
    expect(() =>
      validateDownloadDescriptor({ ...descriptor, url: 'file:///tmp/x' }, 999),
    ).toThrow();
    expect(() =>
      validateDownloadDescriptor({ ...descriptor, ownerId: '../owner' }, 999),
    ).toThrow();
    expect(() => validateDownloadDescriptor(descriptor, 1_000)).toThrow();
  });
  it('validates MIME, extension, non-empty body and size bound', () => {
    expect(() =>
      validateDownloadedMetadata({
        expectedMime: 'application/pdf',
        actualMime: 'application/pdf; charset=binary',
        extension: '.pdf',
        size: 1024,
      }),
    ).not.toThrow();
    for (const input of [
      { actualMime: 'text/html', extension: '.pdf', size: 10 },
      { actualMime: 'application/pdf', extension: '.html', size: 10 },
      { actualMime: 'application/pdf', extension: '.pdf', size: 0 },
      {
        actualMime: 'application/pdf',
        extension: '.pdf',
        size: MAX_SENSITIVE_REPORT_BYTES + 1,
      },
    ]) {
      expect(() =>
        validateDownloadedMetadata({
          expectedMime: 'application/pdf',
          ...input,
        }),
      ).toThrow('DOWNLOAD_VALIDATION_FAILED');
    }
  });
});
