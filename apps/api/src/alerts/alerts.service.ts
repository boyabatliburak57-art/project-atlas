import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  assertExpectedAlertRevision,
  createAlertRevision,
  createNextAlertRevision,
  transitionAlert,
  type AlertRevision,
  type AlertSource,
  type AlertStatus,
} from '@atlas/domain';
import { z } from 'zod';

import type {
  AlertListQueryDto,
  CreateAlertDto,
  HistoryQueryDto,
  UpdateAlertDto,
} from './alerts.dto';
import {
  ALERT_DRY_RUN_EVALUATOR,
  ALERT_STORE,
  type AlertDryRunEvaluator,
  type AlertStore,
  type AlertView,
} from './alerts.ports';

const sourceSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('saved_scan'),
      savedScanId: z.uuid(),
      savedScanRevision: z.number().int().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal('preset_scan'),
      presetScanId: z.uuid(),
      presetScanRevision: z.number().int().min(1),
    })
    .strict(),
  z
    .object({
      type: z.enum([
        'instrument_price',
        'instrument_percent_change',
        'instrument_indicator',
      ]),
      instrumentId: z.uuid(),
    })
    .strict(),
  z
    .object({
      type: z.literal('watchlist_saved_scan'),
      watchlistId: z.uuid(),
      savedScanId: z.uuid(),
      savedScanRevision: z.number().int().min(1),
    })
    .strict(),
]);
const revisionFields = {
  source: sourceSchema,
  triggerPolicy: z.enum([
    'anyMatch',
    'newMatch',
    'symbolEntered',
    'symbolExited',
    'thresholdCrossed',
  ]),
  repeatPolicy: z.enum([
    'once',
    'oncePerClosedBar',
    'oncePerDay',
    'afterReset',
    'everyNewMatch',
  ]),
  timeframe: z.string().trim().min(1).max(16).nullable().default(null),
  evaluationMode: z.enum(['closed_bar', 'intrabar']),
  sourceConfiguration: z.record(z.string(), z.unknown()).default({}),
  channels: z
    .array(z.enum(['in_app', 'email']))
    .min(1)
    .max(2),
} as const;
const createSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    ...revisionFields,
  })
  .strict();
const updateSchema = z
  .object({
    expectedRevision: z.number().int().min(1),
    name: z.string().trim().min(1).max(160).optional(),
    source: revisionFields.source.optional(),
    triggerPolicy: revisionFields.triggerPolicy.optional(),
    repeatPolicy: revisionFields.repeatPolicy.optional(),
    timeframe: z.string().trim().min(1).max(16).nullable().optional(),
    evaluationMode: revisionFields.evaluationMode.optional(),
    sourceConfiguration: revisionFields.sourceConfiguration.optional(),
    channels: revisionFields.channels.optional(),
  })
  .strict();
const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().min(1).max(1024).optional(),
  status: z.enum(['active', 'paused', 'invalid', 'deleted']).optional(),
});
const historySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().min(1).max(1024).optional(),
});
const cursorSchema = z.object({ updatedAt: z.iso.datetime(), id: z.uuid() });

@Injectable()
export class AlertsService {
  constructor(
    @Inject(ALERT_STORE) private readonly store: AlertStore,
    @Inject(ALERT_DRY_RUN_EVALUATOR)
    private readonly dryRunEvaluator: AlertDryRunEvaluator,
  ) {}

  async list(userId: string, query: AlertListQueryDto) {
    const parsed = parse(listSchema, query);
    const cursor =
      parsed.cursor === undefined
        ? undefined
        : parseCursor(parsed.cursor, cursorSchema);
    const page = await this.store.listOwned({
      userId,
      limit: parsed.limit + 1,
      ...(parsed.status === undefined ? {} : { status: parsed.status }),
      ...(cursor === undefined
        ? {}
        : { cursor: { updatedAt: new Date(cursor.updatedAt), id: cursor.id } }),
    });
    const items = page.items.slice(0, parsed.limit);
    const last = items.at(-1);
    return {
      items: items.map(toAlertDto),
      nextCursor:
        page.items.length > parsed.limit && last !== undefined
          ? encodeCursor({
              updatedAt: last.updatedAt.toISOString(),
              id: last.id,
            })
          : null,
    };
  }

  async get(userId: string, rawId: string) {
    return toAlertDto(await this.owned(userId, id(rawId)));
  }

  async create(userId: string, body: CreateAlertDto) {
    const data = parse(createSchema, body);
    const alertId = randomUUID();
    await this.assertSourceAccess(userId, data.source);
    const now = new Date();
    const revision = createAlertRevision({
      alertId,
      source: data.source,
      triggerPolicy: data.triggerPolicy,
      repeatPolicy: data.repeatPolicy,
      timeframe: data.timeframe,
      evaluationMode: data.evaluationMode,
      sourceConfiguration: data.sourceConfiguration,
      channels: data.channels,
      createdBy: userId,
      createdAt: now,
    });
    return toAlertDto(
      await this.store.create({
        id: alertId,
        userId,
        name: data.name,
        revision,
        now,
      }),
    );
  }

  async update(userId: string, rawId: string, body: UpdateAlertDto) {
    const data = parse(updateSchema, body);
    const current = await this.owned(userId, id(rawId));
    this.expected(current.currentRevision, data.expectedRevision);
    const revisionChanged = Object.keys(data).some(
      (key) => !['expectedRevision', 'name'].includes(key),
    );
    const now = new Date();
    if (!revisionChanged) {
      if (data.name === undefined) return toAlertDto(current);
      const updated = await this.store.rename({
        userId,
        id: current.id,
        name: data.name,
        expectedRevision: data.expectedRevision,
        now,
      });
      if (updated === null) this.conflict();
      return toAlertDto(updated);
    }
    if (data.source !== undefined)
      await this.assertSourceAccess(userId, data.source);
    const next = createNextAlertRevision(current.revision, {
      ...(data.source === undefined ? {} : { source: data.source }),
      ...(data.triggerPolicy === undefined
        ? {}
        : { triggerPolicy: data.triggerPolicy }),
      ...(data.repeatPolicy === undefined
        ? {}
        : { repeatPolicy: data.repeatPolicy }),
      ...(data.timeframe === undefined ? {} : { timeframe: data.timeframe }),
      ...(data.evaluationMode === undefined
        ? {}
        : { evaluationMode: data.evaluationMode }),
      ...(data.sourceConfiguration === undefined
        ? {}
        : { sourceConfiguration: data.sourceConfiguration }),
      ...(data.channels === undefined ? {} : { channels: data.channels }),
      createdBy: userId,
      createdAt: now,
    });
    const updated = await this.store.revise({
      userId,
      id: current.id,
      name: data.name ?? current.name,
      expectedRevision: data.expectedRevision,
      revision: next,
      now,
    });
    if (updated === null) this.conflict();
    return toAlertDto(updated);
  }

  delete(userId: string, rawId: string) {
    return this.transition(
      userId,
      rawId,
      ['active', 'paused', 'invalid'],
      'deleted',
    );
  }

  pause(userId: string, rawId: string) {
    return this.transition(userId, rawId, ['active', 'invalid'], 'paused');
  }

  resume(userId: string, rawId: string) {
    return this.transition(userId, rawId, ['paused', 'invalid'], 'active');
  }

  async revisions(userId: string, rawId: string) {
    const alert = await this.owned(userId, id(rawId));
    return (await this.store.revisions(alert.id)).map(toRevisionDto);
  }

  async evaluations(userId: string, rawId: string, query: HistoryQueryDto) {
    const alert = await this.owned(userId, id(rawId));
    const parsed = parse(historySchema, query);
    const before =
      parsed.cursor === undefined
        ? undefined
        : decodeNumberCursor(parsed.cursor);
    const rows = await this.store.evaluations(
      alert.id,
      parsed.limit + 1,
      before,
    );
    const items = rows.slice(0, parsed.limit);
    return {
      items: items.map((row) => ({
        ...row,
        dataCutoffAt: row.dataCutoffAt.toISOString(),
        evaluatedAt: row.evaluatedAt.toISOString(),
      })),
      nextCursor:
        rows.length > parsed.limit && items.at(-1) !== undefined
          ? encodeCursor(items.at(-1)!.id)
          : null,
    };
  }

  async triggers(userId: string, rawId: string, query: HistoryQueryDto) {
    const alert = await this.owned(userId, id(rawId));
    const parsed = parse(historySchema, query);
    const before =
      parsed.cursor === undefined
        ? undefined
        : new Date(decodeStringCursor(parsed.cursor));
    if (before !== undefined && Number.isNaN(before.getTime()))
      invalid('cursor');
    const rows = await this.store.triggers(alert.id, parsed.limit + 1, before);
    const items = rows.slice(0, parsed.limit);
    return {
      items: items.map((row) => ({
        ...row,
        occurredAt: row.occurredAt.toISOString(),
      })),
      nextCursor:
        rows.length > parsed.limit && items.at(-1) !== undefined
          ? encodeCursor(items.at(-1)!.occurredAt.toISOString())
          : null,
    };
  }

  async dryRun(userId: string, rawId: string) {
    const alert = await this.owned(userId, id(rawId));
    const result = await this.dryRunEvaluator.evaluate({
      userId,
      alert,
      dataCutoffAt: new Date(),
    });
    return {
      ...result,
      dataCutoffAt: result.dataCutoffAt.toISOString(),
      dryRun: true as const,
    };
  }

  private async transition(
    userId: string,
    rawId: string,
    from: readonly AlertStatus[],
    to: AlertStatus,
  ) {
    const current = await this.owned(userId, id(rawId));
    try {
      transitionAlert(current, to, new Date());
    } catch {
      invalid('status');
    }
    const updated = await this.store.setStatus({
      userId,
      id: current.id,
      from,
      to,
      now: new Date(),
    });
    if (updated === null) invalid('status');
    return toAlertDto(updated);
  }

  private async owned(userId: string, alertId: string): Promise<AlertView> {
    const alert = await this.store.find(alertId);
    if (alert === null) {
      throw new NotFoundException({
        code: 'ALERT_NOT_FOUND',
        message: 'Alert was not found',
      });
    }
    if (alert.ownerUserId !== userId) {
      throw new ForbiddenException({
        code: 'ALERT_ACCESS_DENIED',
        message: 'Alert belongs to another user',
      });
    }
    return alert;
  }

  private async assertSourceAccess(userId: string, source: AlertSource) {
    const result = await this.store.sourceAccess(userId, source);
    if (result === 'denied') {
      throw new ForbiddenException({
        code: 'ALERT_ACCESS_DENIED',
        message: 'Alert source belongs to another user',
      });
    }
    if (result === 'invalid') {
      throw new BadRequestException({
        code: 'ALERT_SOURCE_INVALID',
        message: 'Alert source is invalid',
      });
    }
  }

  private expected(current: number, expected: number) {
    try {
      assertExpectedAlertRevision(current, expected);
    } catch {
      this.conflict(current);
    }
  }

  private conflict(currentRevision?: number): never {
    throw new ConflictException({
      code: 'ALERT_REVISION_CONFLICT',
      message: 'Alert revision is stale',
      ...(currentRevision === undefined
        ? {}
        : { details: { currentRevision } }),
    });
  }
}

function toAlertDto(alert: AlertView) {
  return {
    ...alert,
    createdAt: alert.createdAt.toISOString(),
    updatedAt: alert.updatedAt.toISOString(),
    deletedAt: alert.deletedAt?.toISOString() ?? null,
    revision: toRevisionDto(alert.revision),
  };
}

function toRevisionDto(revision: AlertRevision) {
  return { ...revision, createdAt: revision.createdAt.toISOString() };
}

function id(value: string): string {
  const result = z.uuid().safeParse(value);
  if (!result.success) invalid('id');
  return result.data;
}

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success)
    invalid(result.error.issues[0]?.path.join('.') ?? 'request');
  return result.data;
}

function invalid(field: string): never {
  throw new BadRequestException({
    code: 'ALERT_INVALID',
    message: 'Alert request is invalid',
    details: { field },
  });
}

function encodeCursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function parseCursor<T extends z.ZodType>(raw: string, schema: T): z.output<T> {
  try {
    return parse(
      schema,
      JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')),
    );
  } catch {
    invalid('cursor');
  }
}

function decodeNumberCursor(raw: string): number {
  const value = parseCursor(raw, z.number().int().positive());
  return value;
}

function decodeStringCursor(raw: string): string {
  return parseCursor(raw, z.string());
}
