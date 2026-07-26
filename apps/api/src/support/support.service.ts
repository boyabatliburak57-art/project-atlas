import { randomBytes } from 'node:crypto';

import {
  notifications,
  operationalAuditEvents,
  supportAttachmentReferences,
  supportRequestEvents,
  supportRequests,
} from '@atlas/database';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ne } from 'drizzle-orm';
import { z } from 'zod';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';

const requestTypes = [
  'bugReport',
  'featureFeedback',
  'dataIssue',
  'accountSupport',
  'securitySupport',
  'other',
] as const;
const statuses = [
  'open',
  'acknowledged',
  'investigating',
  'waitingForUser',
  'resolved',
  'closed',
  'rejected',
] as const;
const dataIssue = z
  .object({
    symbol: z.string().trim().min(1).max(32),
    timeframe: z.string().trim().min(1).max(16),
    dateFrom: z.string().date(),
    dateTo: z.string().date(),
    dataType: z.enum([
      'ohlcv',
      'fundamentals',
      'corporateAction',
      'benchmark',
      'other',
    ]),
    expected: z.string().trim().min(1).max(4_000),
    observed: z.string().trim().min(1).max(4_000),
  })
  .strict();
const createInput = z
  .object({
    type: z.enum(requestTypes),
    subject: z.string().trim().min(4).max(160),
    description: z.string().trim().min(8).max(8_000),
    dataIssue: dataIssue.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.type === 'dataIssue' && value.dataIssue === undefined)
      context.addIssue({
        code: 'custom',
        message: 'Data issue details are required',
        path: ['dataIssue'],
      });
    if (value.type !== 'dataIssue' && value.dataIssue !== undefined)
      context.addIssue({
        code: 'custom',
        message: 'Data issue details are only valid for data issues',
        path: ['dataIssue'],
      });
  });
const messageInput = z
  .object({ message: z.string().trim().min(2).max(8_000) })
  .strict();
const attachmentInput = z
  .object({
    filename: z.string().trim().min(1).max(180),
    contentType: z.enum(['image/png', 'image/jpeg', 'application/pdf']),
    byteSize: z
      .number()
      .int()
      .min(1)
      .max(5 * 1_024 * 1_024),
    checksumSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  })
  .strict();
const adminInput = z
  .object({
    expectedVersion: z.number().int().positive(),
    status: z.enum(statuses).optional(),
    assignedAdminUserId: z.string().uuid().nullable().optional(),
    message: z.string().trim().min(2).max(8_000).optional(),
    internal: z.boolean().default(false),
    correctionRequestId: z.string().uuid().optional(),
    reason: z.string().trim().min(8).max(4_000),
  })
  .strict();

export interface SupportMalwareScanner {
  scan(reference: {
    readonly checksumSha256: string;
    readonly contentType: string;
    readonly storageKey: string;
  }): Promise<'pending' | 'clean' | 'rejected' | 'failed'>;
}

@Injectable()
export class MetadataOnlySupportMalwareScanner implements SupportMalwareScanner {
  scan(reference: {
    readonly checksumSha256: string;
    readonly contentType: string;
    readonly storageKey: string;
  }): Promise<'pending'> {
    void reference;
    return Promise.resolve('pending');
  }
}

@Injectable()
export class SupportService {
  private readonly createWindows = new Map<string, number[]>();

  constructor(
    private readonly connection: ApiDatabase,
    private readonly malware: MetadataOnlySupportMalwareScanner,
  ) {}

  async create(userId: string, correlationId: string, input: unknown) {
    this.enforceCreateRate(userId);
    const command = parse(createInput, input);
    const referenceCode = `SUP-${randomBytes(6).toString('hex').toUpperCase()}`;
    return this.connection.database.transaction(async (tx) => {
      const [row] = await tx
        .insert(supportRequests)
        .values({
          correlationId,
          dataIssue: command.dataIssue ?? null,
          description: command.description,
          ownerUserId: userId,
          referenceCode,
          subject: command.subject,
          type: command.type,
        })
        .returning();
      if (!row) throw new Error('Support request insert failed');
      await tx.insert(supportRequestEvents).values({
        actorUserId: userId,
        kind: 'created',
        message: 'Talep oluşturuldu.',
        requestId: row.id,
      });
      await this.audit(
        tx,
        userId,
        row.id,
        'support.request.created',
        correlationId,
      );
      return this.publicRequest(row, []);
    });
  }

  async list(userId: string) {
    const rows = await this.connection.database
      .select()
      .from(supportRequests)
      .where(eq(supportRequests.ownerUserId, userId))
      .orderBy(desc(supportRequests.updatedAt));
    return { items: rows.map((row) => this.publicRequest(row, [])) };
  }

  async detail(userId: string, id: string) {
    const row = await this.owned(userId, id);
    return this.publicRequest(row, await this.visibleEvents(id));
  }

  async message(userId: string, id: string, input: unknown) {
    const command = parse(messageInput, input);
    const row = await this.owned(userId, id);
    if (['closed', 'rejected'].includes(row.status))
      throw new ConflictException({
        code: 'SUPPORT_REQUEST_NOT_WRITABLE',
        message: 'Support request cannot accept a message',
      });
    await this.connection.database.insert(supportRequestEvents).values({
      actorUserId: userId,
      kind: row.status === 'resolved' ? 'reopened' : 'userMessage',
      message: command.message,
      requestId: id,
    });
    if (row.status === 'resolved')
      await this.connection.database
        .update(supportRequests)
        .set({
          status: 'open',
          updatedAt: new Date(),
          version: row.version + 1,
        })
        .where(
          and(
            eq(supportRequests.id, id),
            eq(supportRequests.ownerUserId, userId),
          ),
        );
    return this.detail(userId, id);
  }

  async attach(userId: string, id: string, input: unknown) {
    const command = parse(attachmentInput, input);
    await this.owned(userId, id);
    if (
      command.filename.includes('/') ||
      command.filename.includes('\\') ||
      command.filename.includes('..') ||
      /[<>:"|?*]/u.test(command.filename) ||
      [...command.filename].some((character) => character.charCodeAt(0) < 32)
    )
      throw invalid('Attachment filename is unsafe');
    const extension = extensionFor(command.contentType);
    const storageKey = `support/${userId}/${id}/${randomBytes(16).toString('hex')}.${extension}`;
    const scan = await this.malware.scan({
      checksumSha256: command.checksumSha256,
      contentType: command.contentType,
      storageKey,
    });
    const [attachment] = await this.connection.database
      .insert(supportAttachmentReferences)
      .values({
        ...command,
        malwareScanStatus: scan,
        ownerUserId: userId,
        requestId: id,
        storageKey,
      })
      .returning();
    await this.connection.database.insert(supportRequestEvents).values({
      actorUserId: userId,
      kind: 'attachmentAdded',
      message: command.filename,
      metadata: { attachmentId: attachment?.id, scan },
      requestId: id,
    });
    return {
      byteSize: command.byteSize,
      contentType: command.contentType,
      filename: command.filename,
      id: attachment?.id,
      malwareScanStatus: scan,
    };
  }

  async adminList() {
    const rows = await this.connection.database
      .select()
      .from(supportRequests)
      .orderBy(desc(supportRequests.updatedAt));
    return {
      items: rows.map((row) => ({
        ...this.publicRequest(row, []),
        assignedAdminUserId: row.assignedAdminUserId,
        slaMetadata: row.slaMetadata,
      })),
    };
  }

  async adminUpdate(
    adminUserId: string,
    correlationId: string,
    id: string,
    input: unknown,
  ) {
    const command = parse(adminInput, input);
    const [current] = await this.connection.database
      .select()
      .from(supportRequests)
      .where(eq(supportRequests.id, id))
      .limit(1);
    if (!current) throw notFound();
    if (current.version !== command.expectedVersion)
      throw new ConflictException({
        code: 'SUPPORT_VERSION_CONFLICT',
        message: 'Support request version changed',
      });
    const nextStatus = command.status ?? current.status;
    const [updated] = await this.connection.database
      .update(supportRequests)
      .set({
        assignedAdminUserId:
          command.assignedAdminUserId === undefined
            ? current.assignedAdminUserId
            : command.assignedAdminUserId,
        closedAt: nextStatus === 'closed' ? new Date() : null,
        correctionRequestId:
          command.correctionRequestId ?? current.correctionRequestId,
        status: nextStatus,
        updatedAt: new Date(),
        version: current.version + 1,
      })
      .where(
        and(
          eq(supportRequests.id, id),
          eq(supportRequests.version, command.expectedVersion),
        ),
      )
      .returning();
    if (!updated) throw new ConflictException();
    const kind =
      command.correctionRequestId !== undefined
        ? 'correctionLinked'
        : command.message !== undefined
          ? command.internal
            ? 'internalNote'
            : 'userMessage'
          : command.assignedAdminUserId !== undefined
            ? 'assigned'
            : 'statusChanged';
    await this.connection.database.insert(supportRequestEvents).values({
      actorUserId: adminUserId,
      fromStatus: current.status,
      kind,
      message: command.message ?? command.reason,
      metadata: {
        correctionRequestId: command.correctionRequestId,
        reason: command.reason,
      },
      requestId: id,
      toStatus: nextStatus,
      userVisible: command.internal ? 'false' : 'true',
    });
    if (!command.internal)
      await this.connection.database.insert(notifications).values({
        body: 'Destek talebiniz güncellendi.',
        metadata: {
          referenceCode: current.referenceCode,
          supportRequestId: id,
        },
        occurredAt: new Date(),
        title: 'Destek talebi güncellendi',
        type: 'systemAnnouncement',
        userId: current.ownerUserId,
      });
    await this.audit(
      this.connection.database,
      adminUserId,
      id,
      'support.request.admin_updated',
      correlationId,
      { before: current, command: { ...command, message: undefined } },
    );
    return this.publicRequest(updated, await this.visibleEvents(id));
  }

  private async owned(userId: string, id: string) {
    const [row] = await this.connection.database
      .select()
      .from(supportRequests)
      .where(
        and(
          eq(supportRequests.id, parseId(id)),
          eq(supportRequests.ownerUserId, userId),
        ),
      )
      .limit(1);
    if (!row) throw notFound();
    return row;
  }

  private async visibleEvents(requestId: string) {
    return this.connection.database
      .select({
        createdAt: supportRequestEvents.createdAt,
        id: supportRequestEvents.id,
        kind: supportRequestEvents.kind,
        message: supportRequestEvents.message,
        toStatus: supportRequestEvents.toStatus,
      })
      .from(supportRequestEvents)
      .where(
        and(
          eq(supportRequestEvents.requestId, requestId),
          ne(supportRequestEvents.userVisible, 'false'),
        ),
      )
      .orderBy(supportRequestEvents.createdAt);
  }

  private publicRequest(
    row: typeof supportRequests.$inferSelect,
    timeline: readonly unknown[],
  ) {
    return {
      closedAt: row.closedAt,
      correlationId: row.correlationId,
      createdAt: row.createdAt,
      dataIssue: row.dataIssue,
      description: row.description,
      id: row.id,
      referenceCode: row.referenceCode,
      status: row.status,
      subject: row.subject,
      timeline,
      type: row.type,
      updatedAt: row.updatedAt,
      version: row.version,
    };
  }

  private enforceCreateRate(userId: string, now = Date.now()) {
    const active = (this.createWindows.get(userId) ?? []).filter(
      (value) => now - value < 60_000,
    );
    if (active.length >= 5)
      throw new HttpException(
        {
          code: 'SUPPORT_RATE_LIMITED',
          message: 'Support request rate limit exceeded',
        },
        429,
      );
    active.push(now);
    this.createWindows.set(userId, active);
  }

  private async audit(
    tx: Pick<typeof this.connection.database, 'insert'>,
    actorUserId: string,
    resourceId: string,
    action: string,
    correlationId: string,
    beforeState?: Record<string, unknown>,
  ) {
    await tx.insert(operationalAuditEvents).values({
      action,
      actorType: 'user',
      actorUserId,
      afterState: { resourceId },
      beforeState,
      correlationId,
      environment: process.env['ATLAS_ENV'] ?? 'local',
      requestId: correlationId,
      resourceId,
      resourceType: 'support_request',
    });
  }
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw invalid('Support request input is invalid');
  return result.data;
}
function parseId(value: string) {
  const result = z.string().uuid().safeParse(value);
  if (!result.success) throw notFound();
  return result.data;
}
function invalid(message: string) {
  return new BadRequestException({
    code: 'SUPPORT_REQUEST_INVALID',
    message,
  });
}
function notFound() {
  return new NotFoundException({
    code: 'SUPPORT_REQUEST_NOT_FOUND',
    message: 'Support request was not found',
  });
}
function extensionFor(contentType: string) {
  return contentType === 'image/png'
    ? 'png'
    : contentType === 'image/jpeg'
      ? 'jpg'
      : 'pdf';
}
