import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NavigationRepository } from './navigation.repository';
import { NavigationService } from './navigation.service';

describe('NavigationService', () => {
  const repository = {
    activity: vi.fn(),
    search: vi.fn(),
  };
  let service: NavigationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NavigationService(
      repository as unknown as NavigationRepository,
      {
        getOrThrow: () => 'task-084-cursor-signing-key-with-safe-length',
      } as unknown as ConfigService,
    );
  });

  it('searches only the static allowlist and returns text highlight segments', async () => {
    repository.search.mockResolvedValue([
      {
        id: '1',
        type: 'instrument',
        title: '<script>THYAO</script>',
        subtitle: 'Türk Hava Yolları',
        href: '/symbols/THYAO',
      },
    ]);

    const result = await service.search('user-a', {
      q: 'THYAO',
      types: 'instrument',
      limit: '10',
    });

    expect(repository.search).toHaveBeenCalledWith(
      'user-a',
      'THYAO',
      ['instrument'],
      0,
      11,
    );
    expect(result.items[0]?.highlight).toEqual([
      { text: '<script>', matched: false },
      { text: 'THYAO', matched: true },
      { text: '</script>', matched: false },
    ]);
  });

  it('binds search cursors to user and query context', async () => {
    repository.search.mockResolvedValue([
      ...Array.from({ length: 11 }, (_, index) => ({
        id: String(index),
        type: 'instrument',
        title: `THYAO ${index}`,
        subtitle: null,
        href: `/symbols/${index}`,
      })),
    ]);
    const first = await service.search('user-a', {
      q: 'THYAO',
      limit: '10',
    });

    await expect(
      service.search('user-b', {
        q: 'THYAO',
        limit: '10',
        cursor: first.nextCursor,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown types and SQL-like undersized queries', async () => {
    await expect(
      service.search('user-a', { q: 'THYAO', types: 'raw_sql' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.search('user-a', { q: '%' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.search).not.toHaveBeenCalled();
  });

  it('removes secret-shaped activity metadata', async () => {
    repository.activity.mockResolvedValue([
      {
        id: '018f6ec7-0e31-7d58-9f8f-111111111111',
        userId: 'user-a',
        eventType: 'scan.completed',
        sourceType: 'scan',
        sourceId: null,
        status: 'completed',
        occurredAt: new Date('2026-07-25T08:00:00Z'),
        summary: 'Tarama tamamlandı',
        metadata: {
          resultCount: 12,
          accessToken: 'must-not-leak',
          connectionString: 'must-not-leak',
        },
        deduplicationKey: 'scan:1:completed',
        expiresAt: new Date('2026-08-25T08:00:00Z'),
        createdAt: new Date('2026-07-25T08:00:00Z'),
      },
    ]);

    const result = await service.activity('user-a', {});

    expect(result.items[0]?.metadata).toEqual({ resultCount: 12 });
  });

  it('keeps activity pagination bounded to one repository query', async () => {
    repository.activity.mockResolvedValue([]);
    await service.activity('user-a', { limit: '50' });
    expect(repository.activity).toHaveBeenCalledOnce();
    expect(repository.activity).toHaveBeenCalledWith('user-a', null, 51);

    await expect(
      service.activity('user-a', { limit: '51' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
