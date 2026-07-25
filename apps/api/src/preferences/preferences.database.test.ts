import 'reflect-metadata';

import type { Server } from 'node:http';

import { createDatabase, runMigrations, securityUsers } from '@atlas/database';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../app.module';
import { configureApplication } from '../bootstrap/configure-application';
import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import { AuthSessionService } from '../security/auth-session.service';
import { hashPassword } from '../security/security-crypto';
import { PreferencesService } from './preferences.service';

const userA = '00000000-0000-4000-8000-000000008301';
const userB = '00000000-0000-4000-8000-000000008302';
const password = 'Preferences-Test-2026!';

describe('preferences ownership and optimistic concurrency', () => {
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
    await db.insert(securityUsers).values([
      {
        id: userA,
        email: 'preferences-a@example.test',
        normalizedEmail: 'preferences-a@example.test',
        passwordHash,
      },
      {
        id: userB,
        email: 'preferences-b@example.test',
        normalizedEmail: 'preferences-b@example.test',
        passwordHash,
      },
    ]);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ApiDatabase)
      .useValue({ database: db, pool })
      .compile();
    app = module.createNestApplication({ logger: false });
    configureApplication(app);
    await app.init();
    const sessions = app.get(AuthSessionService);
    tokenA = (
      await sessions.login(
        { email: 'preferences-a@example.test', password },
        { ip: '127.0.0.1', userAgent: 'preferences-test' },
      )
    ).token;
    tokenB = (
      await sessions.login(
        { email: 'preferences-b@example.test', password },
        { ip: '127.0.0.2', userAgent: 'preferences-test' },
      )
    ).token;
  }, 30_000);

  afterAll(async () => {
    await Promise.allSettled([app?.close(), pool.end()]);
  });

  it('requires authentication and exposes only the current user resource', async () => {
    const server = app.getHttpServer() as Server;
    await expect(app.get(PreferencesService).get(userA)).resolves.toMatchObject(
      {
        userId: userA,
        version: 1,
      },
    );
    await request(server).get('/api/v1/me/preferences').expect(401);
    const initial = await request(server)
      .get('/api/v1/me/preferences')
      .set('authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(body(initial.text).data).toMatchObject({
      userId: userA,
      locale: 'tr-TR',
      version: 1,
    });
  });

  it('persists preferences with an atomic version increment', async () => {
    const response = await request(app.getHttpServer() as Server)
      .patch('/api/v1/me/preferences')
      .set('authorization', `Bearer ${tokenA}`)
      .send({
        expectedVersion: 1,
        timezone: 'UTC',
        defaultBenchmark: 'XU030',
        accessibility: { reducedMotion: true },
        display: {
          compactTable: true,
          methodologyDetailLevel: 'detailed',
        },
      })
      .expect(200);
    expect(body(response.text).data).toMatchObject({
      userId: userA,
      timezone: 'UTC',
      version: 2,
    });
  });

  it('rejects stale updates and caller-supplied ownership fields', async () => {
    const server = app.getHttpServer() as Server;
    await request(server)
      .patch('/api/v1/me/preferences')
      .set('authorization', `Bearer ${tokenA}`)
      .send({ expectedVersion: 1, timezone: 'Europe/London' })
      .expect(409);
    await request(server)
      .patch('/api/v1/me/preferences')
      .set('authorization', `Bearer ${tokenA}`)
      .send({ expectedVersion: 2, userId: userB, timezone: 'UTC' })
      .expect(400);
  });

  it('prevents cross-user preference and onboarding leakage', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/api/v1/me/preferences')
      .set('authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(body(response.text).data).toMatchObject({
      userId: userB,
      timezone: 'Europe/Istanbul',
      version: 1,
    });
    expect(response.text).not.toContain(userA);
  });
});

function requireDatabaseUrl(): string {
  const value = process.env['TEST_DATABASE_URL'];
  if (!value) throw new Error('TEST_DATABASE_URL is required');
  return value;
}

function body(text: string): { data: Record<string, unknown> } {
  return JSON.parse(text) as { data: Record<string, unknown> };
}
