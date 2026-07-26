import 'reflect-metadata';

import type { Server } from 'node:http';

import {
  createDatabase,
  accountDeletionRequests,
  notifications,
  operationalAuditEvents,
  runMigrations,
  securityUsers,
  supportAttachmentReferences,
  supportRequestEvents,
} from '@atlas/database';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../app.module';
import { configureApplication } from '../bootstrap/configure-application';
import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import { AuthSessionService } from '../security/auth-session.service';
import { hashPassword } from '../security/security-crypto';

const adminId = '00000000-0000-4000-8000-000000009901';
const userA = '00000000-0000-4000-8000-000000009902';
const userB = '00000000-0000-4000-8000-000000009903';
const password = 'Support-Lifecycle-Test-2026!';

describe('support, feedback and secure account assistance', () => {
  const { db, pool } = createDatabase(requireDatabaseUrl());
  let app: INestApplication;
  let adminToken: string;
  let tokenA: string;
  let tokenB: string;
  let requestId: string;

  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    const passwordHash = await hashPassword(password);
    await db
      .insert(securityUsers)
      .values([
        account(adminId, 'support-admin@example.test', passwordHash, [
          'operations_admin',
        ]),
        account(userA, 'support-a@example.test', passwordHash),
        account(userB, 'support-b@example.test', passwordHash),
      ]);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ApiDatabase)
      .useValue({ database: db, pool })
      .compile();
    app = module.createNestApplication({ logger: false });
    configureApplication(app);
    await app.init();
    const sessions = app.get(AuthSessionService);
    adminToken = await login(sessions, 'support-admin@example.test');
    tokenA = await login(sessions, 'support-a@example.test');
    tokenB = await login(sessions, 'support-b@example.test');
  }, 30_000);

  afterAll(async () => {
    await Promise.allSettled([app?.close(), pool.end()]);
  });

  it('creates a data issue with a safe reference, correlation id and timeline', async () => {
    const response = await request(server())
      .post('/api/v1/support/requests')
      .set(auth(tokenA))
      .send({
        dataIssue: {
          dataType: 'ohlcv',
          dateFrom: '2026-07-01',
          dateTo: '2026-07-25',
          expected: 'Günlük kapanış 120,50 olmalı.',
          observed: 'Ekranda 0 görünüyor.',
          symbol: 'THYAO',
          timeframe: '1d',
        },
        description: 'Fiyat serisinde beklenmeyen değer gözlemledim.',
        subject: 'THYAO veri sorunu',
        type: 'dataIssue',
      })
      .expect(201);
    const created = data<{
      correlationId: string;
      id: string;
      referenceCode: string;
      status: string;
    }>(response);
    requestId = created.id;
    expect(created.referenceCode).toMatch(/^SUP-[A-F0-9]{12}$/u);
    expect(created.correlationId).toBeTruthy();
    expect(created.status).toBe('open');
    const detail = await request(server())
      .get(`/api/v1/support/requests/${requestId}`)
      .set(auth(tokenA))
      .expect(200);
    expect(data<{ timeline: unknown[] }>(detail).timeline).toHaveLength(1);
  });

  it('isolates list/detail and resists cross-user IDOR', async () => {
    expect(
      data<{ items: unknown[] }>(
        await request(server())
          .get('/api/v1/support/requests')
          .set(auth(tokenA))
          .expect(200),
      ).items,
    ).toHaveLength(1);
    await request(server())
      .get(`/api/v1/support/requests/${requestId}`)
      .set(auth(tokenB))
      .expect(404);
    await request(server())
      .post(`/api/v1/support/requests/${requestId}/messages`)
      .set(auth(tokenB))
      .send({ message: 'Başkasının talebine erişim denemesi' })
      .expect(404);
  });

  it('accepts only bounded safe attachment references behind a scan boundary', async () => {
    const checksum = 'a'.repeat(64);
    const attached = await request(server())
      .post(`/api/v1/support/requests/${requestId}/attachments`)
      .set(auth(tokenA))
      .send({
        byteSize: 1_024,
        checksumSha256: checksum,
        contentType: 'image/png',
        filename: 'chart.png',
      })
      .expect(201);
    expect(
      data<{ malwareScanStatus: string }>(attached).malwareScanStatus,
    ).toBe('pending');
    await request(server())
      .post(`/api/v1/support/requests/${requestId}/attachments`)
      .set(auth(tokenA))
      .send({
        byteSize: 5 * 1_024 * 1_024 + 1,
        checksumSha256: checksum,
        contentType: 'text/html',
        filename: '../payload.html',
      })
      .expect(400);
    const [stored] = await db
      .select()
      .from(supportAttachmentReferences)
      .where(eq(supportAttachmentReferences.requestId, requestId));
    expect(stored?.storageKey).toMatch(
      new RegExp(`^support/${userA}/${requestId}/[a-f0-9]{32}\\.png$`, 'u'),
    );
    expect(stored?.storageKey).not.toContain(stored?.filename);
  });

  it('enforces admin RBAC, assignment, status and optimistic versioning', async () => {
    await request(server())
      .get('/api/v1/admin/support/requests')
      .set(auth(tokenA))
      .expect(403);
    const updated = await request(server())
      .post(`/api/v1/admin/support/requests/${requestId}/actions`)
      .set(auth(adminToken))
      .send({
        assignedAdminUserId: adminId,
        expectedVersion: 1,
        reason: 'Talep veri operasyonlarına atanıyor.',
        status: 'investigating',
      })
      .expect(201);
    expect(data<{ status: string; version: number }>(updated)).toMatchObject({
      status: 'investigating',
      version: 2,
    });
    await request(server())
      .post(`/api/v1/admin/support/requests/${requestId}/actions`)
      .set(auth(adminToken))
      .send({
        expectedVersion: 1,
        reason: 'Eski sürüm ile tekrar güncelleme.',
        status: 'resolved',
      })
      .expect(409);
  });

  it('keeps internal notes private and delivers user-visible responses', async () => {
    await request(server())
      .post(`/api/v1/admin/support/requests/${requestId}/actions`)
      .set(auth(adminToken))
      .send({
        expectedVersion: 2,
        internal: true,
        message: 'INTERNAL_SENSITIVE_TRIAGE',
        reason: 'İç operasyon değerlendirmesi kaydediliyor.',
      })
      .expect(201);
    const visible = await request(server())
      .post(`/api/v1/admin/support/requests/${requestId}/actions`)
      .set(auth(adminToken))
      .send({
        expectedVersion: 3,
        message: 'Veri kaynağını inceliyoruz.',
        reason: 'Kullanıcıya durum bilgisi gönderiliyor.',
        status: 'waitingForUser',
      })
      .expect(201);
    expect(visible.text).not.toContain('INTERNAL_SENSITIVE_TRIAGE');
    expect(visible.text).toContain('Veri kaynağını inceliyoruz.');
    expect(
      await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userA)),
    ).toHaveLength(2);
  });

  it('links a correction request without exposing admin-only metadata', async () => {
    const correctionRequestId = '00000000-0000-4000-8000-000000009999';
    const response = await request(server())
      .post(`/api/v1/admin/support/requests/${requestId}/actions`)
      .set(auth(adminToken))
      .send({
        correctionRequestId,
        expectedVersion: 4,
        reason: 'Onaylı veri düzeltme incelemesine bağlanıyor.',
      })
      .expect(201);
    expect(response.text).not.toContain('slaMetadata');
    const events = await db
      .select()
      .from(supportRequestEvents)
      .where(
        and(
          eq(supportRequestEvents.requestId, requestId),
          eq(supportRequestEvents.kind, 'correctionLinked'),
        ),
      );
    expect(events).toHaveLength(1);
  });

  it('rate limits creation and records complete audit without secret content', async () => {
    for (let index = 0; index < 4; index += 1)
      await request(server())
        .post('/api/v1/support/requests')
        .set(auth(tokenB))
        .send({
          description: `Yinelenmeyen destek talebi açıklaması ${index}`,
          subject: `Destek talebi ${index}`,
          type: 'other',
        })
        .expect(201);
    await request(server())
      .post('/api/v1/support/requests')
      .set(auth(tokenB))
      .send({
        description: 'Beşinci izin verilen talep açıklaması',
        subject: 'Beşinci talep',
        type: 'other',
      })
      .expect(201);
    await request(server())
      .post('/api/v1/support/requests')
      .set(auth(tokenB))
      .send({
        description: 'Limit üzerindeki destek talebi açıklaması',
        subject: 'Limit talebi',
        type: 'other',
      })
      .expect(429);
    const audits = await db
      .select()
      .from(operationalAuditEvents)
      .where(eq(operationalAuditEvents.resourceType, 'support_request'));
    expect(audits.length).toBeGreaterThanOrEqual(7);
    expect(JSON.stringify(audits)).not.toContain(password);
  });

  it('supports audited grace-period deletion cancellation by operations', async () => {
    await request(server())
      .post('/api/v1/account/deletion')
      .set(auth(tokenA))
      .send({ idempotencyKey: 'support-assisted-cancellation-099' })
      .expect(201);
    const [deletion] = await db
      .select()
      .from(accountDeletionRequests)
      .where(eq(accountDeletionRequests.userId, userA));
    await request(server())
      .post(`/api/v1/admin/account/deletion/${deletion?.id}/cancel`)
      .set(auth(adminToken))
      .send({ reason: 'Kullanıcı grace period içinde iptal istedi.' })
      .expect(201);
    const [accountRow] = await db
      .select()
      .from(securityUsers)
      .where(eq(securityUsers.id, userA));
    expect(accountRow?.accountStatus).toBe('active');
    const [cancelled] = await db
      .select()
      .from(accountDeletionRequests)
      .where(eq(accountDeletionRequests.id, deletion!.id));
    expect(cancelled?.status).toBe('cancelled');
  });

  function server(): Server {
    return app.getHttpServer() as Server;
  }
});

function account(
  id: string,
  email: string,
  passwordHash: string,
  roles: readonly string[] = [],
) {
  return { email, id, normalizedEmail: email, passwordHash, roles };
}
async function login(service: AuthSessionService, email: string) {
  return (
    await service.login(
      { email, password },
      { ip: '127.0.0.1', userAgent: 'support-lifecycle-test' },
    )
  ).token;
}
function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}
function data<T>(response: { body: unknown }): T {
  return (response.body as { data: T }).data;
}
function requireDatabaseUrl() {
  const value = process.env['TEST_DATABASE_URL'];
  if (!value) throw new Error('TEST_DATABASE_URL is required');
  return value;
}
