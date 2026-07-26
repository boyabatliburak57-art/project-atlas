import { operationalAuditEvents, userDemoResources } from '@atlas/database';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';

const disclaimer =
  'DEMO — Bu örnek ve finansal sonuç yatırım tavsiyesi, getiri garantisi veya gerçek kullanıcı verisi değildir.';

const fixtures = [
  {
    label: 'DEMO · BIST izleme listesi',
    payload: { symbols: ['THYAO', 'ASELS', 'TUPRS'] },
    resourceType: 'watchlist',
    stableKey: 'demo-watchlist-v1',
  },
  {
    label: 'DEMO · Likidite ve momentum taraması',
    payload: {
      rule: 'volume > 20d average AND close > 50d average',
      timeframe: '1d',
    },
    resourceType: 'savedScan',
    stableKey: 'demo-saved-scan-v1',
  },
  {
    label: 'DEMO · Dengeli portföy',
    payload: {
      currency: 'TRY',
      positions: [
        { quantity: '10', symbol: 'THYAO' },
        { quantity: '5', symbol: 'ASELS' },
      ],
    },
    resourceType: 'portfolio',
    stableKey: 'demo-portfolio-v1',
  },
  {
    label: 'DEMO · Fiyat seviyesi alarmı',
    payload: { condition: 'close above configured level', status: 'paused' },
    resourceType: 'alert',
    stableKey: 'demo-alert-v1',
  },
  {
    label: 'DEMO · Hareketli ortalama stratejisi',
    payload: {
      entry: 'fast moving average crosses above slow moving average',
      exit: 'fast moving average crosses below slow moving average',
    },
    resourceType: 'strategy',
    stableKey: 'demo-strategy-v1',
  },
  {
    label: 'DEMO · Deterministic backtest sonucu',
    payload: {
      dataCutoffAt: '2025-12-31T21:00:00.000Z',
      methodologyVersion: 'demo-backtest-v1',
      result: 'illustrative-only',
      seed: 'atlas-demo-v1',
    },
    resourceType: 'backtestResult',
    stableKey: 'demo-backtest-result-v1',
  },
] as const;

@Injectable()
export class DemoService {
  private readonly environment: string;

  constructor(
    private readonly connection: ApiDatabase,
    config: ConfigService,
  ) {
    this.environment = config.getOrThrow<string>('ATLAS_ENV');
  }

  list(ownerUserId: string) {
    return this.connection.database
      .select()
      .from(userDemoResources)
      .where(eq(userDemoResources.ownerUserId, ownerUserId))
      .orderBy(userDemoResources.resourceType);
  }

  async create(ownerUserId: string, requestId?: string) {
    return this.connection.database.transaction(async (transaction) => {
      await transaction
        .insert(userDemoResources)
        .values(
          fixtures.map((fixture) => ({
            ...fixture,
            disclaimer,
            isDemo: true,
            ownerUserId,
          })),
        )
        .onConflictDoNothing();
      const resources = await transaction
        .select()
        .from(userDemoResources)
        .where(eq(userDemoResources.ownerUserId, ownerUserId))
        .orderBy(userDemoResources.resourceType);
      await transaction.insert(operationalAuditEvents).values({
        action: 'demo_resources.created',
        actorType: 'user',
        actorUserId: ownerUserId,
        afterState: { count: resources.length, demoOnly: true },
        environment: this.environment,
        reason: 'User requested deterministic product demo resources',
        requestId,
        resourceId: ownerUserId,
        resourceType: 'user_demo_bundle',
      });
      return resources;
    });
  }

  async reset(ownerUserId: string, requestId?: string) {
    return this.connection.database.transaction(async (transaction) => {
      const removed = await transaction
        .delete(userDemoResources)
        .where(
          and(
            eq(userDemoResources.ownerUserId, ownerUserId),
            eq(userDemoResources.isDemo, true),
          ),
        )
        .returning({ id: userDemoResources.id });
      await transaction.insert(operationalAuditEvents).values({
        action: 'demo_resources.reset',
        actorType: 'user',
        actorUserId: ownerUserId,
        afterState: { remaining: 0 },
        beforeState: { count: removed.length, demoOnly: true },
        environment: this.environment,
        reason: 'User reset only their demo resource bundle',
        requestId,
        resourceId: ownerUserId,
        resourceType: 'user_demo_bundle',
      });
      return { removed: removed.length };
    });
  }
}
