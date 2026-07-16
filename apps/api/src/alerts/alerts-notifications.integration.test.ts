import type { Server } from 'node:http';

import { UnauthorizedException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AlertRevision } from '@atlas/domain';
import type { Request } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../app.module';
import { configureApplication } from '../bootstrap/configure-application';
import {
  AUTHENTICATED_USER_RESOLVER,
  type AuthenticatedUserResolver,
} from '../common/auth/authenticated-user';
import {
  ALERT_DRY_RUN_EVALUATOR,
  ALERT_STORE,
  type AlertDryRunEvaluator,
  type AlertStore,
  type AlertView,
} from './alerts.ports';
import {
  NOTIFICATION_CENTER_STORE,
  type NotificationCenterStore,
  type NotificationPreferenceView,
  type NotificationView,
} from '../notifications/notifications.ports';

const ownerId = '00000000-0000-4000-8000-000000003801';
const otherId = '00000000-0000-4000-8000-000000003802';
const ownedScanId = '00000000-0000-4000-8000-000000003811';
const foreignScanId = '00000000-0000-4000-8000-000000003812';
const firstNotificationId = '00000000-0000-4000-8000-000000003821';
const otherNotificationId = '00000000-0000-4000-8000-000000003822';

class MemoryAlertStore implements AlertStore {
  readonly alerts = new Map<string, AlertView>();

  listOwned(input: Parameters<AlertStore['listOwned']>[0]) {
    const items = [...this.alerts.values()]
      .filter((alert) => alert.ownerUserId === input.userId)
      .filter(
        (alert) => input.status === undefined || alert.status === input.status,
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, input.limit);
    return Promise.resolve({ items, hasNext: false });
  }

  find(id: string) {
    return Promise.resolve(this.alerts.get(id) ?? null);
  }

  create(input: Parameters<AlertStore['create']>[0]) {
    const alert: AlertView = {
      id: input.id,
      ownerUserId: input.userId,
      name: input.name,
      status: 'active',
      currentRevision: 1,
      revision: input.revision,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
    };
    this.alerts.set(alert.id, alert);
    return Promise.resolve(alert);
  }

  revise(input: Parameters<AlertStore['revise']>[0]) {
    const current = this.alerts.get(input.id);
    if (
      current === undefined ||
      current.currentRevision !== input.expectedRevision
    ) {
      return Promise.resolve(null);
    }
    const alert = {
      ...current,
      name: input.name,
      currentRevision: input.revision.revision,
      revision: input.revision,
      updatedAt: input.now,
    };
    this.alerts.set(alert.id, alert);
    return Promise.resolve(alert);
  }

  rename(input: Parameters<AlertStore['rename']>[0]) {
    const current = this.alerts.get(input.id);
    if (
      current === undefined ||
      current.currentRevision !== input.expectedRevision
    ) {
      return Promise.resolve(null);
    }
    const alert = { ...current, name: input.name, updatedAt: input.now };
    this.alerts.set(alert.id, alert);
    return Promise.resolve(alert);
  }

  setStatus(input: Parameters<AlertStore['setStatus']>[0]) {
    const current = this.alerts.get(input.id);
    if (current === undefined || !input.from.includes(current.status))
      return Promise.resolve(null);
    const alert: AlertView = {
      ...current,
      status: input.to,
      deletedAt: input.to === 'deleted' ? input.now : null,
      updatedAt: input.now,
    };
    this.alerts.set(alert.id, alert);
    return Promise.resolve(alert);
  }

  revisions(alertId: string) {
    const current = this.alerts.get(alertId);
    return Promise.resolve(current === undefined ? [] : [current.revision]);
  }

  evaluations() {
    return Promise.resolve([]);
  }

  triggers() {
    return Promise.resolve([]);
  }

  sourceAccess(userId: string, source: AlertRevision['source']) {
    if ('savedScanId' in source) {
      if (source.savedScanId === foreignScanId)
        return Promise.resolve('denied' as const);
      if (source.savedScanId !== ownedScanId || userId !== ownerId)
        return Promise.resolve('invalid' as const);
    }
    return Promise.resolve('allowed' as const);
  }
}

class FixtureDryRun implements AlertDryRunEvaluator {
  calls = 0;

  evaluate(input: Parameters<AlertDryRunEvaluator['evaluate']>[0]) {
    this.calls += 1;
    return Promise.resolve({
      status: 'not_matched' as const,
      reasonCode: null,
      matchedInstrumentIds: [],
      dataCutoffAt: input.dataCutoffAt,
    });
  }
}

class MemoryNotificationStore implements NotificationCenterStore {
  readonly notifications = new Map<string, NotificationView>();
  readonly preferences = new Map<string, NotificationPreferenceView>();

  constructor() {
    const occurredAt = new Date('2026-07-15T08:00:00.000Z');
    this.notifications.set(
      firstNotificationId,
      notification(firstNotificationId, ownerId, occurredAt),
    );
    this.notifications.set(
      otherNotificationId,
      notification(otherNotificationId, otherId, occurredAt),
    );
  }

  list(input: Parameters<NotificationCenterStore['list']>[0]) {
    return Promise.resolve(
      [...this.notifications.values()]
        .filter((item) => item.userId === input.userId)
        .filter(
          (item) =>
            input.unread === undefined ||
            (item.readAt === null) === input.unread,
        )
        .slice(0, input.limit),
    );
  }

  find(id: string) {
    return Promise.resolve(this.notifications.get(id) ?? null);
  }

  countUnread(userId: string) {
    return Promise.resolve(
      [...this.notifications.values()].filter(
        (item) => item.userId === userId && item.readAt === null,
      ).length,
    );
  }

  markRead(userId: string, id: string, at: Date) {
    return Promise.resolve(
      this.change(userId, id, (item) =>
        item.readAt === null ? { ...item, readAt: at } : null,
      ),
    );
  }

  markUnread(userId: string, id: string) {
    return Promise.resolve(
      this.change(userId, id, (item) =>
        item.readAt === null ? null : { ...item, readAt: null },
      ),
    );
  }

  markAllRead(userId: string, at: Date) {
    let count = 0;
    for (const [id, item] of this.notifications) {
      if (item.userId === userId && item.readAt === null) {
        this.notifications.set(id, { ...item, readAt: at });
        count += 1;
      }
    }
    return Promise.resolve(count);
  }

  getPreferences(userId: string) {
    return Promise.resolve(this.preferences.get(userId) ?? null);
  }

  putPreferences(value: NotificationPreferenceView) {
    this.preferences.set(value.userId, value);
    return Promise.resolve(value);
  }

  private change(
    userId: string,
    id: string,
    update: (item: NotificationView) => NotificationView | null,
  ) {
    const current = this.notifications.get(id);
    if (current === undefined || current.userId !== userId) return null;
    const value = update(current);
    if (value !== null) this.notifications.set(id, value);
    return value;
  }
}

function notification(
  id: string,
  userId: string,
  occurredAt: Date,
): NotificationView {
  return {
    id,
    userId,
    type: 'alertTriggered',
    title: 'RSI alert',
    body: 'Condition matched',
    metadata: { alertId: 'alert-id' },
    readAt: null,
    occurredAt,
    expiresAt: null,
    createdAt: occurredAt,
  };
}

describe('Alerts and notifications API', () => {
  const alertStore = new MemoryAlertStore();
  const notificationStore = new MemoryNotificationStore();
  const dryRun = new FixtureDryRun();
  let application: INestApplication;
  let alertId: string;

  const userResolver: AuthenticatedUserResolver = (httpRequest: Request) => {
    const userId = httpRequest.get('x-test-user-id');
    if (userId === undefined)
      throw new UnauthorizedException({ code: 'AUTHENTICATION_REQUIRED' });
    return userId;
  };

  beforeAll(async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTHENTICATED_USER_RESOLVER)
      .useValue(userResolver)
      .overrideProvider(ALERT_STORE)
      .useValue(alertStore)
      .overrideProvider(ALERT_DRY_RUN_EVALUATOR)
      .useValue(dryRun)
      .overrideProvider(NOTIFICATION_CENTER_STORE)
      .useValue(notificationStore)
      .compile();
    application = moduleReference.createNestApplication();
    configureApplication(application);
    await application.init();
  });

  afterAll(async () => application.close());

  it('creates, revises and controls the alert lifecycle with optimistic concurrency', async () => {
    const created = await request(server(application))
      .post('/api/v1/alerts')
      .set('x-test-user-id', ownerId)
      .send(alertRequest(ownedScanId))
      .expect(201);
    alertId = (created.body as { data: { id: string } }).data.id;
    expect(created.body).toMatchObject({
      data: { status: 'active', currentRevision: 1 },
    });

    const revised = await request(server(application))
      .patch(`/api/v1/alerts/${alertId}`)
      .set('x-test-user-id', ownerId)
      .send({ expectedRevision: 1, repeatPolicy: 'afterReset' })
      .expect(200);
    expect(revised.body).toMatchObject({
      data: { currentRevision: 2, revision: { repeatPolicy: 'afterReset' } },
    });

    const conflict = await request(server(application))
      .patch(`/api/v1/alerts/${alertId}`)
      .set('x-test-user-id', ownerId)
      .send({ expectedRevision: 1, name: 'stale' })
      .expect(409);
    expect(conflict.body).toMatchObject({
      error: { code: 'ALERT_REVISION_CONFLICT' },
    });

    await request(server(application))
      .post(`/api/v1/alerts/${alertId}/pause`)
      .set('x-test-user-id', ownerId)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ data: { status: 'paused' } }),
      );
    await request(server(application))
      .post(`/api/v1/alerts/${alertId}/resume`)
      .set('x-test-user-id', ownerId)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ data: { status: 'active' } }),
      );
    await request(server(application))
      .get(`/api/v1/alerts/${alertId}/revisions`)
      .set('x-test-user-id', ownerId)
      .expect(200);
    await request(server(application))
      .get(`/api/v1/alerts/${alertId}/evaluations`)
      .set('x-test-user-id', ownerId)
      .expect(200);
    await request(server(application))
      .get(`/api/v1/alerts/${alertId}/triggers`)
      .set('x-test-user-id', ownerId)
      .expect(200);
  });

  it('enforces alert and source ownership', async () => {
    await request(server(application))
      .get(`/api/v1/alerts/${alertId}`)
      .set('x-test-user-id', otherId)
      .expect(403);
    const denied = await request(server(application))
      .post('/api/v1/alerts')
      .set('x-test-user-id', ownerId)
      .send(alertRequest(foreignScanId))
      .expect(403);
    expect(denied.body).toMatchObject({
      error: { code: 'ALERT_ACCESS_DENIED' },
    });
  });

  it('dry-runs without creating a trigger, notification or delivery', async () => {
    const alertCount = alertStore.alerts.size;
    const notificationCount = notificationStore.notifications.size;
    const response = await request(server(application))
      .post(`/api/v1/alerts/${alertId}/test`)
      .set('x-test-user-id', ownerId)
      .expect(200);
    expect(response.body).toMatchObject({
      data: { status: 'not_matched', dryRun: true },
    });
    expect(dryRun.calls).toBe(1);
    expect(alertStore.alerts.size).toBe(alertCount);
    expect(notificationStore.notifications.size).toBe(notificationCount);
  });

  it('lists notifications, enforces IDOR and keeps read operations idempotent', async () => {
    await request(server(application))
      .get('/api/v1/notifications')
      .set('x-test-user-id', ownerId)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ data: [{ id: firstNotificationId }] }),
      );
    await request(server(application))
      .post(`/api/v1/notifications/${otherNotificationId}/read`)
      .set('x-test-user-id', ownerId)
      .expect(403);
    await request(server(application))
      .post(`/api/v1/notifications/${firstNotificationId}/read`)
      .set('x-test-user-id', ownerId)
      .expect(200);
    await request(server(application))
      .post(`/api/v1/notifications/${firstNotificationId}/read`)
      .set('x-test-user-id', ownerId)
      .expect(200);
    await request(server(application))
      .post(`/api/v1/notifications/${firstNotificationId}/unread`)
      .set('x-test-user-id', ownerId)
      .expect(200);
    await request(server(application))
      .get('/api/v1/notifications/unread-count')
      .set('x-test-user-id', ownerId)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ data: { unreadCount: 1 } }),
      );
  });

  it('marks all read only for the current user', async () => {
    await request(server(application))
      .post('/api/v1/notifications/mark-all-read')
      .set('x-test-user-id', ownerId)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ data: { updatedCount: 1 } }),
      );
    expect(
      notificationStore.notifications.get(firstNotificationId)?.readAt,
    ).toBeInstanceOf(Date);
    expect(
      notificationStore.notifications.get(otherNotificationId)?.readAt,
    ).toBeNull();
  });

  it('validates IANA timezone and persists complete preferences', async () => {
    const invalid = await request(server(application))
      .put('/api/v1/notification-preferences')
      .set('x-test-user-id', ownerId)
      .send(preferences('Mars/Olympus'))
      .expect(400);
    expect(invalid.body).toMatchObject({
      error: {
        code: 'NOTIFICATION_PREFERENCE_INVALID',
        details: { field: 'timezone' },
      },
    });
    const saved = await request(server(application))
      .put('/api/v1/notification-preferences')
      .set('x-test-user-id', ownerId)
      .send(preferences('Europe/Istanbul'))
      .expect(200);
    expect(saved.body).toMatchObject({
      data: { timezone: 'Europe/Istanbul', quietHoursEnabled: true },
    });
    await request(server(application))
      .get('/api/v1/notification-preferences')
      .set('x-test-user-id', ownerId)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ data: { timezone: 'Europe/Istanbul' } }),
      );
  });
});

function alertRequest(savedScanId: string) {
  return {
    name: 'Oversold scan',
    source: { type: 'saved_scan', savedScanId, savedScanRevision: 1 },
    triggerPolicy: 'newMatch',
    repeatPolicy: 'everyNewMatch',
    timeframe: '1d',
    evaluationMode: 'closed_bar',
    sourceConfiguration: {},
    channels: ['in_app', 'email'],
  };
}

function preferences(timezone: string) {
  return {
    timezone,
    locale: 'tr-TR',
    emailAlertsEnabled: true,
    dailyDigestEnabled: false,
    scanCompletionEnabled: true,
    quietHoursEnabled: true,
    quietHoursStartMinute: 1320,
    quietHoursEndMinute: 480,
    throttleMinutes: 5,
  };
}

function server(application: INestApplication): Server {
  return application.getHttpServer() as Server;
}
