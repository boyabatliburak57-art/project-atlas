import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NavigationRepository } from '../navigation/navigation.repository';
import type { ReportsRepository } from './reports.repository';
import { csvCell, ReportsService } from './reports.service';

describe('ReportsService', () => {
  const repository = {
    create: vi.fn(),
    find: vi.fn(),
    list: vi.fn(),
    ownsSource: vi.fn(),
    softDelete: vi.fn(),
  };
  const activity = { recordActivity: vi.fn() };
  let service: ReportsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReportsService(
      repository as unknown as ReportsRepository,
      activity as unknown as NavigationRepository,
      {
        getOrThrow: () => 'task-085-download-token-key-with-safe-length',
      } as unknown as ConfigService,
    );
  });

  it('creates a transparent report without exposing storage key or payload', async () => {
    repository.ownsSource.mockResolvedValue(true);
    repository.create.mockImplementation((value: Record<string, unknown>) =>
      Promise.resolve({
        ...value,
        id: '018f6ec7-0e31-7d58-9f8f-111111111111',
        createdAt: new Date('2026-07-25T10:00:00Z'),
        updatedAt: new Date('2026-07-25T10:00:00Z'),
        deletedAt: null,
      }),
    );

    const result = await service.create(
      'user-a',
      [],
      {
        format: 'csv',
        reportType: 'portfolio',
        sourceId: '018f6ec7-0e31-7d58-9f8f-222222222222',
      },
      new Date('2026-07-25T10:00:00Z'),
    );

    expect(repository.ownsSource).toHaveBeenCalledWith(
      'user-a',
      'portfolio',
      '018f6ec7-0e31-7d58-9f8f-222222222222',
    );
    expect(result).not.toHaveProperty('storageKey');
    expect(result).not.toHaveProperty('artifactPayload');
    expect(result.methodology).toMatchObject({
      report: 'report-v1',
      freshness: 'market-freshness-v1',
    });
    expect(activity.recordActivity).toHaveBeenCalledOnce();
  });

  it('returns not found for another users source and rejects internal fields', async () => {
    repository.ownsSource.mockResolvedValue(false);
    await expect(
      service.create('user-b', [], {
        reportType: 'portfolio',
        sourceId: '018f6ec7-0e31-7d58-9f8f-222222222222',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.create('user-a', [], {
        reportType: 'account_security',
        storageKey: '../../internal-secret',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('binds short-lived downloads to user and report', async () => {
    const now = new Date('2026-07-25T10:00:00Z');
    repository.find.mockResolvedValue({
      id: '018f6ec7-0e31-7d58-9f8f-111111111111',
      reportType: 'account_security',
      status: 'ready',
      expiresAt: new Date('2026-07-26T10:00:00Z'),
      contentType: 'text/csv; charset=utf-8',
      artifactPayload: Buffer.from('safe'),
    });
    const link = await service.downloadLink(
      'user-a',
      '018f6ec7-0e31-7d58-9f8f-111111111111',
      now,
    );

    await expect(
      service.download(
        'user-b',
        '018f6ec7-0e31-7d58-9f8f-111111111111',
        link.downloadUrl.split('token=')[1]!,
        now,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.download(
        'user-a',
        '018f6ec7-0e31-7d58-9f8f-111111111111',
        link.downloadUrl.split('token=')[1]!,
        new Date(now.getTime() + 61_000),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('escapes every CSV formula prefix and quotes', () => {
    for (const value of [
      '=HYPERLINK("https://evil")',
      '+cmd',
      '-2+3',
      '@SUM(A1:A2)',
    ])
      expect(csvCell(value)).toMatch(/^"'/u);
    expect(csvCell('safe"value')).toBe('"safe""value"');
  });

  it('keeps report pagination and generation input bounded', async () => {
    repository.list.mockResolvedValue([]);
    await service.list('user-a', { limit: '50' });
    expect(repository.list).toHaveBeenCalledOnce();
    expect(repository.list).toHaveBeenCalledWith('user-a', null, 51);

    await expect(
      service.list('user-a', { limit: '51' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create('user-a', [], {
        reportType: 'account_security',
        oversizedPayload: 'x'.repeat(1024 * 1024),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
