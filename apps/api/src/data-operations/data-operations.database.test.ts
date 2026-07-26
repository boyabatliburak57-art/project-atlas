import 'reflect-metadata';

import type { Server } from 'node:http';

import {
  createDatabase,
  dataCorrectionRequests,
  dataQualityFindings,
  operationalAuditEvents,
  providerConnections,
  providerDataRevisions,
  runMigrations,
  securityUsers,
} from '@atlas/database';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../app.module';
import { configureApplication } from '../bootstrap/configure-application';
import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import { AuthSessionService } from '../security/auth-session.service';
import { hashPassword } from '../security/security-crypto';

const adminId = '00000000-0000-4000-8000-000000009501';
const userId = '00000000-0000-4000-8000-000000009502';
const findingId = '00000000-0000-4000-8000-000000009503';
const connectionId = '00000000-0000-4000-8000-000000009504';
const revisionId = '00000000-0000-4000-8000-000000009505';
const password = 'Data-Operations-Test-2026!';

describe('data correction admin authority, audit and replay controls', () => {
  const { db, pool } = createDatabase(requireDatabaseUrl());
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    const passwordHash = await hashPassword(password);
    await db.insert(securityUsers).values([
      {
        email: 'data-operations-admin@example.test',
        id: adminId,
        normalizedEmail: 'data-operations-admin@example.test',
        passwordHash,
        roles: ['operations_admin'],
      },
      {
        email: 'data-operations-user@example.test',
        id: userId,
        normalizedEmail: 'data-operations-user@example.test',
        passwordHash,
      },
    ]);
    await db.insert(providerConnections).values({
      capabilities: ['ohlcv'],
      credentialReference: 'secret://test/market-provider',
      environment: 'test',
      id: connectionId,
      providerKey: 'contract-test-provider',
      status: 'degraded',
    });
    await db.insert(providerDataRevisions).values({
      availableAt: new Date('2026-01-02T00:00:00Z'),
      capability: 'ohlcv',
      contentHash: 'a'.repeat(64),
      id: revisionId,
      providerConnectionId: connectionId,
      providerRevision: 'provider-revision-2',
      resourceKey: 'BIST:X:1d:2026-01-01',
      resourceType: 'priceBar',
      sourceTimestamp: new Date('2026-01-01T20:00:00Z'),
    });
    await db.insert(dataQualityFindings).values({
      evidence: { missingAt: '2026-01-01T00:00:00Z' },
      fingerprint: 'b'.repeat(64),
      findingType: 'missingBar',
      firstDetectedAt: new Date('2026-01-02T01:00:00Z'),
      id: findingId,
      lastDetectedAt: new Date('2026-01-02T01:00:00Z'),
      providerConnectionId: connectionId,
      resourceKey: 'BIST:X:1d',
      resourceType: 'priceBar',
      severity: 'warning',
    });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ApiDatabase)
      .useValue({ database: db, pool })
      .compile();
    app = module.createNestApplication({ logger: false });
    configureApplication(app);
    await app.init();
    const sessions = app.get(AuthSessionService);
    adminToken = (
      await sessions.login(
        { email: 'data-operations-admin@example.test', password },
        { ip: '127.0.0.1', userAgent: 'data-operations-test' },
      )
    ).token;
    userToken = (
      await sessions.login(
        { email: 'data-operations-user@example.test', password },
        { ip: '127.0.0.2', userAgent: 'data-operations-test' },
      )
    ).token;
  }, 30_000);

  afterAll(async () => {
    await Promise.allSettled([app?.close(), pool.end()]);
  });

  it('denies non-admin access and does not trust caller-asserted roles', async () => {
    await request(app.getHttpServer() as Server)
      .get('/api/v1/admin/data-operations')
      .set('authorization', `Bearer ${userToken}`)
      .set('x-atlas-admin-role', 'operations_admin')
      .expect(403);
  });

  it('audits before/after state and enforces optimistic concurrency', async () => {
    const created = await request(app.getHttpServer() as Server)
      .post('/api/v1/admin/data-operations/corrections')
      .set('authorization', `Bearer ${adminToken}`)
      .set('x-correlation-id', 'correction-correlation-1')
      .send({
        expectedFindingVersion: 1,
        findingId,
        reason: 'Investigate missing provider bar',
      })
      .expect(201);
    const id = (created.body as { data: { id: string } }).data.id;
    await request(app.getHttpServer() as Server)
      .post(`/api/v1/admin/data-operations/corrections/${id}/investigating`)
      .set('authorization', `Bearer ${adminToken}`)
      .send({ expectedVersion: 1, reason: 'Evidence review started' })
      .expect(201);
    await request(app.getHttpServer() as Server)
      .post(`/api/v1/admin/data-operations/corrections/${id}/approved`)
      .set('authorization', `Bearer ${adminToken}`)
      .send({ expectedVersion: 1, reason: 'Stale version must fail' })
      .expect(409);
    const audits = await db
      .select()
      .from(operationalAuditEvents)
      .where(eq(operationalAuditEvents.resourceId, id));
    expect(audits).toHaveLength(2);
    expect(audits[1]).toMatchObject({
      action: 'data_correction.investigating',
      actorUserId: adminId,
    });
    expect(audits[1]?.beforeState).not.toEqual(audits[1]?.afterState);
  });

  it('requires confirmation and queues one immutable revision replay', async () => {
    const [correction] = await db
      .select()
      .from(dataCorrectionRequests)
      .limit(1);
    expect(correction).toBeDefined();
    const id = correction!.id;
    await request(app.getHttpServer() as Server)
      .post(`/api/v1/admin/data-operations/corrections/${id}/approved`)
      .set('authorization', `Bearer ${adminToken}`)
      .send({ expectedVersion: 2, reason: 'Provider evidence verified' })
      .expect(201);
    await request(app.getHttpServer() as Server)
      .post(`/api/v1/admin/data-operations/corrections/${id}/replayQueued`)
      .set('authorization', `Bearer ${adminToken}`)
      .send({
        confirmation: 'yes',
        expectedVersion: 3,
        reason: 'Replay immutable corrected revision',
        replayIdempotencyKey: 'replay-correction-9501',
        targetRevisionId: revisionId,
      })
      .expect(400);
    const queued = await request(app.getHttpServer() as Server)
      .post(`/api/v1/admin/data-operations/corrections/${id}/replayQueued`)
      .set('authorization', `Bearer ${adminToken}`)
      .send({
        confirmation: 'QUEUE_CONTROLLED_REPLAY',
        expectedVersion: 3,
        reason: 'Replay immutable corrected revision',
        replayIdempotencyKey: 'replay-correction-9501',
        targetRevisionId: revisionId,
      })
      .expect(201);
    expect((queued.body as { data: unknown }).data).toMatchObject({
      rebuildStatus: 'stale',
      state: 'replayQueued',
      targetRevisionId: revisionId,
    });
  });
});

function requireDatabaseUrl(): string {
  const value = process.env['TEST_DATABASE_URL'];
  if (!value) throw new Error('TEST_DATABASE_URL is required');
  return value;
}
