import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import { NavigationRepository } from '../navigation/navigation.repository';
import { ReportsRepository } from './reports.repository';
import { ReportsDispatcher } from './reports.dispatcher';

const REPORT_TYPES = [
  'portfolio',
  'scanner',
  'alert_history',
  'backtest',
  'experiment_matrix',
  'account_security',
  'admin_operations',
] as const;
const createSchema = z
  .object({
    reportType: z.enum(REPORT_TYPES),
    sourceId: z.string().uuid().nullable().optional(),
    format: z.enum(['pdf', 'csv', 'json']).default('pdf'),
    dataCutoffAt: z.string().datetime().optional(),
    idempotencyKey: z.string().min(16).max(128).optional(),
  })
  .strict();
const listSchema = z
  .object({
    cursor: z.string().max(512).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

@Injectable()
export class ReportsService {
  private readonly tokenKey: string;
  constructor(
    private readonly repository: ReportsRepository,
    private readonly activity: NavigationRepository,
    config: ConfigService,
    private readonly dispatcher: ReportsDispatcher,
  ) {
    this.tokenKey = config.getOrThrow<string>('AUTH_SESSION_HMAC_KEY');
  }

  async create(
    userId: string,
    roles: readonly string[],
    input: unknown,
    now = new Date(),
  ) {
    const command = parse(createSchema, input);
    const sourceId = command.sourceId ?? null;
    if (command.reportType === 'admin_operations') {
      if (!roles.includes('operations_admin')) throw notFound();
    } else if (command.reportType === 'account_security') {
      if (sourceId !== null)
        throw invalid('Account reports do not accept a source id');
    } else {
      if (
        sourceId === null ||
        !(await this.repository.ownsSource(
          userId,
          command.reportType,
          sourceId,
        ))
      )
        throw notFound();
    }
    const dataCutoffAt = command.dataCutoffAt
      ? new Date(command.dataCutoffAt)
      : now;
    if (dataCutoffAt > now)
      throw invalid('Data cutoff cannot be in the future');
    const requestHash = createHash('sha256')
      .update(
        command.idempotencyKey === undefined
          ? JSON.stringify({
              command,
              dataCutoffAt: dataCutoffAt.toISOString(),
              userId,
            })
          : `${userId}\u0000${command.idempotencyKey}`,
      )
      .digest('hex');
    const row = await this.repository.create({
      dataCutoffAt,
      expiresAt: new Date(now.getTime() + 7 * 86_400_000),
      methodology: methodology(command.reportType),
      ownerUserId: userId,
      reportType: command.reportType,
      requestHash,
      sourceId,
      sourceRevisions: {
        format: command.format,
        schema: 'report-v1',
        sourceRevision: 'current',
      },
      sourceType: command.reportType,
      status: 'queued',
      warnings: [],
    });
    await this.audit(userId, row.id, 'report.queued', 'queued', now);
    await this.dispatcher.dispatch({
      correlationId: requestHash.slice(0, 32),
      ownerUserId: userId,
      reportId: row.id,
    });
    return publicReport(row);
  }

  async list(userId: string, input: Record<string, unknown>) {
    const query = parse(listSchema, input);
    const context = `report-list:${userId}`;
    const cursor =
      query.cursor === undefined
        ? null
        : this.decode<{ createdAt: string; id: string }>(query.cursor, context);
    const rows = await this.repository.list(
      userId,
      cursor === null
        ? null
        : { createdAt: new Date(cursor.createdAt), id: cursor.id },
      query.limit + 1,
    );
    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit);
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        hasMore && last !== undefined
          ? this.encode(
              { createdAt: last.createdAt.toISOString(), id: last.id },
              context,
            )
          : null,
    };
  }

  async get(userId: string, id: string) {
    id = reportId(id);
    const row = await this.repository.find(userId, id);
    if (row === null) throw notFound();
    return publicReport(row);
  }

  async cancel(userId: string, id: string, now = new Date()) {
    id = reportId(id);
    const row = await this.repository.cancel(userId, id);
    if (row === null) {
      if ((await this.repository.find(userId, id)) === null) throw notFound();
      throw new ConflictException({
        code: 'REPORT_NOT_CANCELLABLE',
        message: 'Report is not cancellable in its current state',
      });
    }
    await this.audit(userId, id, 'report.cancelled', 'cancelled', now);
    return publicReport(row);
  }

  async delete(userId: string, id: string, now = new Date()) {
    id = reportId(id);
    if ((await this.repository.softDelete(userId, id)) === null)
      throw notFound();
    await this.audit(userId, id, 'report.deleted', 'deleted', now);
    return { id, deleted: true };
  }

  async downloadLink(userId: string, id: string, now = new Date()) {
    id = reportId(id);
    const row = await this.readyReport(userId, id, now);
    const expiresAt = new Date(now.getTime() + 60_000);
    const token = this.encode(
      { expiresAt: expiresAt.toISOString(), reportId: id, userId },
      `report-download:${userId}:${id}`,
    );
    return {
      downloadUrl: `/api/v1/reports/${id}/download?token=${token}`,
      expiresAt,
      filename: filename(row.reportType, id, row.contentType),
    };
  }

  async download(userId: string, id: string, token: string, now = new Date()) {
    id = reportId(id);
    const value = this.decode<{
      expiresAt: string;
      reportId: string;
      userId: string;
    }>(token, `report-download:${userId}:${id}`);
    if (
      value.userId !== userId ||
      value.reportId !== id ||
      new Date(value.expiresAt) <= now
    )
      throw invalid('Download token is invalid or expired');
    const row = await this.readyReport(userId, id, now);
    await this.audit(userId, id, 'report.downloaded', 'completed', now);
    return {
      bytes: row.artifactPayload!,
      contentType: row.contentType!,
      filename: filename(row.reportType, id, row.contentType),
    };
  }

  private async readyReport(userId: string, id: string, now: Date) {
    const row = await this.repository.find(userId, id);
    if (row === null) throw notFound();
    if (row.status !== 'ready' || row.expiresAt <= now)
      throw new ConflictException({
        code: 'REPORT_NOT_DOWNLOADABLE',
        message: 'Report is not ready or has expired',
      });
    return row;
  }

  private async audit(
    userId: string,
    reportId: string,
    eventType: string,
    status: string,
    now: Date,
  ) {
    await this.activity.recordActivity({
      deduplicationKey: `${eventType}:${reportId}:${now.toISOString()}`,
      eventType,
      expiresAt: new Date(now.getTime() + 90 * 86_400_000),
      occurredAt: now,
      sourceId: reportId,
      sourceType: 'report',
      status,
      summary: eventType.replace('.', ' '),
      userId,
    });
  }

  private encode(value: object, context: string) {
    const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
    const signature = createHmac('sha256', this.tokenKey)
      .update(`${context}.${payload}`)
      .digest('base64url');
    return `${payload}.${signature}`;
  }

  private decode<T>(token: string, context: string): T {
    const [payload, signature, extra] = token.split('.');
    if (payload === undefined || signature === undefined || extra !== undefined)
      throw invalid('Token or cursor is invalid');
    const expected = createHmac('sha256', this.tokenKey)
      .update(`${context}.${payload}`)
      .digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    )
      throw invalid('Token or cursor is invalid');
    try {
      return JSON.parse(Buffer.from(payload, 'base64url').toString()) as T;
    } catch {
      throw invalid('Token or cursor is invalid');
    }
  }
}

export function csvCell(value: string) {
  const safe = /^[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

function methodology(reportType: string) {
  return {
    report: 'report-v1',
    reportType,
    indicator: 'registry-current',
    valuation: 'portfolio-valuation-v1',
    risk: 'portfolio-risk-v1',
    backtest: 'backtest-engine-current',
    benchmark: 'benchmark-policy-current',
    adjustment: 'adjusted',
    freshness: 'market-freshness-v1',
  };
}

function filename(type: string, id: string, contentType: string | null) {
  const extension = contentType?.startsWith('application/pdf')
    ? 'pdf'
    : contentType?.startsWith('text/csv')
      ? 'csv'
      : 'json';
  return `atlas-${type}-${id.slice(0, 8)}.${extension}`;
}

function publicReport<T extends Record<string, unknown>>(row: T) {
  return Object.fromEntries(
    Object.entries(row).filter(
      ([key]) => key !== 'artifactPayload' && key !== 'storageKey',
    ),
  );
}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw invalid('Report request is invalid');
  return parsed.data;
}

function invalid(message: string) {
  return new BadRequestException({ code: 'INVALID_REPORT_REQUEST', message });
}

function notFound() {
  return new NotFoundException({
    code: 'REPORT_NOT_FOUND',
    message: 'Report was not found',
  });
}

function reportId(value: string) {
  const parsed = z.string().uuid().safeParse(value);
  if (!parsed.success) throw invalid('Report id is invalid');
  return parsed.data;
}
