import { describe, expect, it } from 'vitest';
import {
  REPORT_REGISTRY,
  canUseDownload,
  csvCell,
  normalizeHelpQuery,
  preferenceMutation,
  redactDiagnostics,
  redactOperationsTelemetry,
  safeOperationsIntent,
  sanitizeSupportText,
  supportFormErrors,
  validateReportRequest,
} from './reports-settings-model';

describe('TASK-100I operations contracts', () => {
  it('uses a versioned report registry', () => {
    expect(REPORT_REGISTRY).toHaveLength(7);
    expect(REPORT_REGISTRY.every((item) => item.version === 1)).toBe(true);
  });
  it('blocks unsupported and offline report mutations', () => {
    expect(
      validateReportRequest({ type: 'UNKNOWN', format: 'xlsx', offline: true }),
    ).toEqual([
      'NETWORK_UNAVAILABLE',
      'REPORT_TYPE_UNSUPPORTED',
      'SOURCE_REQUIRED',
      'FORMAT_UNSUPPORTED',
    ]);
  });
  it('neutralizes every spreadsheet formula prefix', () => {
    for (const value of ['=SUM(A1)', '+cmd', '-2+3', '@link'])
      expect(csvCell(value)).toMatch(/^"'/u);
  });
  it('requires owner, ready state, and unexpired download', () => {
    expect(
      canUseDownload({
        owner: true,
        status: 'ready',
        expiresAt: '2026-08-09T00:00:00Z',
        now: '2026-08-08T00:00:00Z',
      }),
    ).toBe(true);
    expect(
      canUseDownload({
        owner: false,
        status: 'ready',
        expiresAt: '2026-08-09T00:00:00Z',
        now: '2026-08-08T00:00:00Z',
      }),
    ).toBe(false);
  });
  it('normalizes and bounds help queries', () => {
    expect(normalizeHelpQuery('  Şifre   sıfırlama  ')).toBe('Şifre sıfırlama');
    expect(normalizeHelpQuery('x'.repeat(100))).toHaveLength(80);
  });
  it('sanitizes support content and validates forms', () => {
    expect(
      sanitizeSupportText('<script>bad()</script><b>Güvenli metin</b>'),
    ).toBe('Güvenli metin');
    expect(supportFormErrors({ subject: 'a', description: 'b' })).toHaveLength(
      2,
    );
  });
  it('redacts diagnostics by explicit consent allowlist', () => {
    expect(
      redactDiagnostics({
        appVersion: '1',
        token: 'secret',
        portfolioValue: 10,
      }),
    ).toEqual({ appVersion: '1' });
  });
  it('preserves expectedVersion conflict and offline semantics', () => {
    expect(preferenceMutation({ expectedVersion: 1, serverVersion: 2 })).toBe(
      'conflict',
    );
    expect(
      preferenceMutation({
        expectedVersion: 1,
        serverVersion: 1,
        offline: true,
      }),
    ).toBe('offline');
  });
  it('allowlists operations deep-link intents', () => {
    expect(safeOperationsIntent('reports/ready')).toBe(true);
    expect(safeOperationsIntent('../admin')).toBe(false);
  });
  it('removes private operations telemetry fields', () => {
    expect(
      redactOperationsTelemetry({
        event: 'report_opened_type',
        signedUrl: 'secret',
        supportSubject: 'private',
      }),
    ).toEqual({ event: 'report_opened_type' });
  });
});
