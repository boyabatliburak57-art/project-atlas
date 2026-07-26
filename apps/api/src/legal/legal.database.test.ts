import 'reflect-metadata';

import type { Server } from 'node:http';

import {
  createDatabase,
  legalDocuments,
  operationalAuditEvents,
  runMigrations,
  securityUsers,
  userDocumentConsents,
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

const adminId = '00000000-0000-4000-8000-000000009701';
const userA = '00000000-0000-4000-8000-000000009702';
const userB = '00000000-0000-4000-8000-000000009703';
const password = 'Legal-Consent-Test-2026!';

describe('versioned legal documents and user consent', () => {
  const { db, pool } = createDatabase(requireDatabaseUrl());
  let app: INestApplication;
  let adminToken: string;
  let tokenA: string;
  let tokenB: string;
  let riskDocumentId: string;

  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    const passwordHash = await hashPassword(password);
    await db
      .insert(securityUsers)
      .values([
        user('legal-admin@example.test', adminId, passwordHash, [
          'operations_admin',
        ]),
        user('legal-user-a@example.test', userA, passwordHash),
        user('legal-user-b@example.test', userB, passwordHash),
      ]);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ApiDatabase)
      .useValue({ database: db, pool })
      .compile();
    app = module.createNestApplication({ logger: false });
    configureApplication(app);
    await app.init();
    const sessions = app.get(AuthSessionService);
    adminToken = await login(sessions, 'legal-admin@example.test');
    tokenA = await login(sessions, 'legal-user-a@example.test');
    tokenB = await login(sessions, 'legal-user-b@example.test');
  }, 30_000);

  afterAll(async () => {
    await Promise.allSettled([app?.close(), pool.end()]);
  });

  it('keeps seeded placeholders under legal review and denies non-admin creation', async () => {
    const placeholders = await db.select().from(legalDocuments);
    expect(placeholders).toHaveLength(7);
    expect(
      placeholders.every(
        ({ content, status }) =>
          status === 'legalReviewRequired' &&
          content.includes('NOT_FOR_PRODUCTION_PUBLICATION'),
      ),
    ).toBe(true);
    await request(server())
      .post('/api/v1/admin/legal/documents')
      .set(auth(tokenA))
      .send(documentCommand('investmentRiskDisclosure', 2))
      .expect(403);
  });

  it('creates a draft and denies publishing or placeholder approval without review', async () => {
    const created = await request(server())
      .post('/api/v1/admin/legal/documents')
      .set(auth(adminToken))
      .send(documentCommand('investmentRiskDisclosure', 2))
      .expect(201);
    riskDocumentId = data<{ id: string }>(created).id;
    expect(data<{ status: string }>(created).status).toBe('draft');
    await request(server())
      .post(`/api/v1/admin/legal/documents/${riskDocumentId}/publish`)
      .set(auth(adminToken))
      .send({
        effectiveAt: '2026-07-26T00:00:00.000Z',
        expectedVersion: 1,
        reason: 'Attempt publication before legal approval',
      })
      .expect(400);
    const placeholder = (
      await db
        .select()
        .from(legalDocuments)
        .where(eq(legalDocuments.documentType, 'termsOfUse'))
        .limit(1)
    )[0]!;
    await request(server())
      .post(`/api/v1/admin/legal/documents/${placeholder.id}/approve`)
      .set(auth(adminToken))
      .send(reviewCommand(1))
      .expect(400);
  });

  it('requires approval evidence, optimistic version and audit before publishing', async () => {
    const approved = await request(server())
      .post(`/api/v1/admin/legal/documents/${riskDocumentId}/approve`)
      .set(auth(adminToken))
      .set('x-correlation-id', 'legal-review-9701')
      .send(reviewCommand(1))
      .expect(201);
    expect(
      data<{ rowVersion: number; status: string }>(approved),
    ).toMatchObject({ rowVersion: 2, status: 'approved' });
    await request(server())
      .post(`/api/v1/admin/legal/documents/${riskDocumentId}/publish`)
      .set(auth(adminToken))
      .send({
        effectiveAt: '2026-07-26T00:00:00.000Z',
        expectedVersion: 1,
        reason: 'Reject stale publication command',
      })
      .expect(409);
    const published = await request(server())
      .post(`/api/v1/admin/legal/documents/${riskDocumentId}/publish`)
      .set(auth(adminToken))
      .send({
        effectiveAt: '2026-07-26T00:00:00.000Z',
        expectedVersion: 2,
        reason: 'Publish counsel-reviewed risk disclosure',
      })
      .expect(201);
    expect(data<{ status: string }>(published).status).toBe('published');
    const audits = await db
      .select()
      .from(operationalAuditEvents)
      .where(eq(operationalAuditEvents.resourceId, riskDocumentId));
    expect(audits.map(({ action }) => action)).toEqual([
      'legal_document.created',
      'legal_document.approved',
      'legal_document.published',
    ]);
  });

  it('exposes only effective published locale content and keeps it immutable', async () => {
    const publicDocument = await request(server())
      .get('/api/v1/legal/documents/investmentRiskDisclosure?locale=tr-TR')
      .expect(200);
    expect(
      data<{ locale: string; version: number }>(publicDocument),
    ).toMatchObject({ locale: 'tr-TR', version: 2 });
    await request(server())
      .get('/api/v1/legal/documents/investmentRiskDisclosure?locale=en-US')
      .expect(404);
    await expect(
      db
        .update(legalDocuments)
        .set({ content: 'mutated published content' })
        .where(eq(legalDocuments.id, riskDocumentId)),
    ).rejects.toThrow();
    const [unchanged] = await db
      .select({ content: legalDocuments.content })
      .from(legalDocuments)
      .where(eq(legalDocuments.id, riskDocumentId));
    expect(unchanged?.content).not.toBe('mutated published content');
  });

  it('records registration consent with immutable version and locale snapshots', async () => {
    const first = await request(server())
      .post('/api/v1/legal/consents')
      .set(auth(tokenA))
      .send({
        documentId: riskDocumentId,
        locale: 'tr-TR',
        source: 'registration',
      })
      .expect(201);
    expect(
      data<{ documentVersion: number; locale: string; source: string }>(first),
    ).toMatchObject({
      documentVersion: 2,
      locale: 'tr-TR',
      source: 'registration',
    });
    await request(server())
      .post('/api/v1/legal/consents')
      .set(auth(tokenA))
      .send({
        documentId: riskDocumentId,
        locale: 'tr-TR',
        source: 'registration',
      })
      .expect(201);
    expect(
      await db
        .select()
        .from(userDocumentConsents)
        .where(
          and(
            eq(userDocumentConsents.userId, userA),
            eq(userDocumentConsents.documentId, riskDocumentId),
          ),
        ),
    ).toHaveLength(1);
  });

  it('requires re-consent for a material new version without rewriting history', async () => {
    const version3 = await createApprovePublish('investmentRiskDisclosure', 3);
    const history = await request(server())
      .get('/api/v1/me/consents?locale=tr-TR')
      .set(auth(tokenA))
      .expect(200);
    const body = data<{
      history: Array<{ documentVersion: number }>;
      reconsentRequired: Array<{ documentId: string; version: number }>;
    }>(history);
    expect(
      body.history.map(({ documentVersion }) => documentVersion),
    ).toContain(2);
    expect(body.reconsentRequired).toContainEqual({
      documentId: version3,
      documentType: 'investmentRiskDisclosure',
      locale: 'tr-TR',
      version: 3,
    });
    await request(server())
      .post('/api/v1/legal/consents')
      .set(auth(tokenA))
      .send({
        documentId: version3,
        locale: 'tr-TR',
        source: 'reconsent',
      })
      .expect(201);
  });

  it('isolates consent history by authenticated user and supports onboarding/settings sources', async () => {
    const termsId = await createApprovePublish('termsOfUse', 2);
    await request(server())
      .post('/api/v1/legal/consents')
      .set(auth(tokenB))
      .send({
        documentId: termsId,
        locale: 'tr-TR',
        source: 'onboarding',
      })
      .expect(201);
    const response = await request(server())
      .get('/api/v1/me/consents')
      .set(auth(tokenB))
      .expect(200);
    const consentHistory = data<{
      history: Array<{ documentId: string; userId: string }>;
    }>(response);
    expect(consentHistory.history).toEqual([
      expect.objectContaining({ documentId: termsId, userId: userB }),
    ]);
    await request(server()).get('/api/v1/me/consents').expect(401);
  });

  it('allows withdrawal only where applicable and preserves acceptance history', async () => {
    await request(server())
      .post('/api/v1/legal/consents/withdraw')
      .set(auth(tokenA))
      .send({
        documentId: riskDocumentId,
        reason: 'Withdrawal should not apply to mandatory risk notice',
      })
      .expect(400);
    const cookieId = await createApprovePublish('cookieConsentNotice', 2);
    await request(server())
      .post('/api/v1/legal/consents')
      .set(auth(tokenA))
      .send({
        documentId: cookieId,
        locale: 'tr-TR',
        source: 'settings',
      })
      .expect(201);
    await request(server())
      .post('/api/v1/legal/consents/withdraw')
      .set(auth(tokenA))
      .send({
        documentId: cookieId,
        reason: 'Withdraw optional cookie consent in account settings',
      })
      .expect(201);
    const events = await db
      .select()
      .from(userDocumentConsents)
      .where(
        and(
          eq(userDocumentConsents.userId, userA),
          eq(userDocumentConsents.documentId, cookieId),
        ),
      );
    expect(events.map(({ action }) => action).sort()).toEqual([
      'accepted',
      'withdrawn',
    ]);
  });

  async function createApprovePublish(
    documentType: string,
    version: number,
  ): Promise<string> {
    const created = await request(server())
      .post('/api/v1/admin/legal/documents')
      .set(auth(adminToken))
      .send(documentCommand(documentType, version))
      .expect(201);
    const document = data<{ id: string }>(created);
    await request(server())
      .post(`/api/v1/admin/legal/documents/${document.id}/approve`)
      .set(auth(adminToken))
      .send(reviewCommand(1))
      .expect(201);
    await request(server())
      .post(`/api/v1/admin/legal/documents/${document.id}/publish`)
      .set(auth(adminToken))
      .send({
        effectiveAt: '2026-07-26T00:00:00.000Z',
        expectedVersion: 2,
        reason: 'Publish reviewed legal document fixture',
      })
      .expect(201);
    return document.id;
  }

  function server(): Server {
    return app.getHttpServer() as Server;
  }
});

function documentCommand(documentType: string, version: number) {
  return {
    content: `Counsel review test content for ${documentType} version ${version}.`,
    documentType,
    locale: 'tr-TR',
    materialChange: true,
    reason: 'Create a versioned legal document for review',
    title: `${documentType} v${version}`,
    version,
  };
}

function reviewCommand(expectedVersion: number) {
  return {
    confirmation: 'LEGAL_COUNSEL_APPROVED',
    expectedVersion,
    legalApprovalReference: 'COUNSEL-TEST-EVIDENCE-9701',
    reason: 'Record external counsel approval evidence',
  };
}

function user(
  email: string,
  id: string,
  passwordHash: string,
  roles: readonly string[] = [],
) {
  return { email, id, normalizedEmail: email, passwordHash, roles };
}

async function login(service: AuthSessionService, email: string) {
  return (
    await service.login(
      { email, password },
      { ip: '127.0.0.1', userAgent: 'legal-consent-test' },
    )
  ).token;
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

function data<T>(response: { body: unknown }): T {
  return (response.body as { data: T }).data;
}

function requireDatabaseUrl(): string {
  const value = process.env['TEST_DATABASE_URL'];
  if (!value) throw new Error('TEST_DATABASE_URL is required');
  return value;
}
