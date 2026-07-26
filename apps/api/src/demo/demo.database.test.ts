import 'reflect-metadata';

import type { Server } from 'node:http';

import {
  createDatabase,
  operationalAuditEvents,
  portfolios,
  runMigrations,
  securityUsers,
  userDemoResources,
  watchlists,
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

const userA = '00000000-0000-4000-8000-000000009801';
const userB = '00000000-0000-4000-8000-000000009802';
const password = 'Demo-Resource-Test-2026!';

describe('owner-isolated deterministic demo resources', () => {
  const { db, pool } = createDatabase(requireDatabaseUrl());
  let app: INestApplication;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    const passwordHash = await hashPassword(password);
    await db
      .insert(securityUsers)
      .values([
        account(userA, 'demo-a@example.test', passwordHash),
        account(userB, 'demo-b@example.test', passwordHash),
      ]);
    await db.insert(watchlists).values({
      name: 'REAL user watchlist',
      ownerUserId: userA,
    });
    await db.insert(portfolios).values({
      name: 'REAL user portfolio',
      userId: userA,
    });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ApiDatabase)
      .useValue({ database: db, pool })
      .compile();
    app = module.createNestApplication({ logger: false });
    configureApplication(app);
    await app.init();
    const sessions = app.get(AuthSessionService);
    tokenA = await login(sessions, 'demo-a@example.test');
    tokenB = await login(sessions, 'demo-b@example.test');
  }, 30_000);

  afterAll(async () => {
    await Promise.allSettled([app?.close(), pool.end()]);
  });

  it('creates the complete deterministic DEMO bundle with a safe disclaimer', async () => {
    const created = await request(server())
      .post('/api/v1/me/demo')
      .set(auth(tokenA))
      .expect(201);
    const resources = data<
      Array<{
        disclaimer: string;
        isDemo: boolean;
        label: string;
        ownerUserId: string;
        resourceType: string;
      }>
    >(created);
    expect(resources).toHaveLength(6);
    expect(new Set(resources.map(({ resourceType }) => resourceType))).toEqual(
      new Set([
        'watchlist',
        'savedScan',
        'portfolio',
        'alert',
        'strategy',
        'backtestResult',
      ]),
    );
    expect(
      resources.every(
        ({ disclaimer, isDemo, label, ownerUserId }) =>
          isDemo &&
          label.includes('DEMO') &&
          ownerUserId === userA &&
          disclaimer.includes('yatırım tavsiyesi'),
      ),
    ).toBe(true);
  });

  it('is idempotent and never duplicates the demo bundle', async () => {
    await request(server())
      .post('/api/v1/me/demo')
      .set(auth(tokenA))
      .expect(201);
    expect(
      await db
        .select()
        .from(userDemoResources)
        .where(eq(userDemoResources.ownerUserId, userA)),
    ).toHaveLength(6);
  });

  it('returns only the authenticated owner demo resources', async () => {
    await request(server())
      .post('/api/v1/me/demo')
      .set(auth(tokenB))
      .expect(201);
    const response = await request(server())
      .get('/api/v1/me/demo')
      .set(auth(tokenB))
      .expect(200);
    const resources = data<Array<{ ownerUserId: string }>>(response);
    expect(resources).toHaveLength(6);
    expect(resources.every(({ ownerUserId }) => ownerUserId === userB)).toBe(
      true,
    );
    expect(response.text).not.toContain(userA);
    await request(server()).get('/api/v1/me/demo').expect(401);
  });

  it('resets only caller demo records and preserves every real or other-owner resource', async () => {
    const reset = await request(server())
      .delete('/api/v1/me/demo')
      .set(auth(tokenA))
      .expect(200);
    expect(data<{ removed: number }>(reset)).toEqual({ removed: 6 });
    expect(
      await db
        .select()
        .from(userDemoResources)
        .where(eq(userDemoResources.ownerUserId, userA)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(userDemoResources)
        .where(eq(userDemoResources.ownerUserId, userB)),
    ).toHaveLength(6);
    expect(await db.select().from(watchlists)).toEqual([
      expect.objectContaining({ name: 'REAL user watchlist' }),
    ]);
    expect(await db.select().from(portfolios)).toEqual([
      expect.objectContaining({ name: 'REAL user portfolio' }),
    ]);
    const audit = await db
      .select()
      .from(operationalAuditEvents)
      .where(eq(operationalAuditEvents.action, 'demo_resources.reset'));
    expect(audit).toEqual([
      expect.objectContaining({
        actorUserId: userA,
        beforeState: { count: 6, demoOnly: true },
      }),
    ]);
  });

  function server(): Server {
    return app.getHttpServer() as Server;
  }
});

function account(id: string, email: string, passwordHash: string) {
  return { email, id, normalizedEmail: email, passwordHash };
}

async function login(service: AuthSessionService, email: string) {
  return (
    await service.login(
      { email, password },
      { ip: '127.0.0.1', userAgent: 'demo-resource-test' },
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
