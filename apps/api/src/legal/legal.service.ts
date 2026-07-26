import {
  legalDocuments,
  operationalAuditEvents,
  userDocumentConsents,
} from '@atlas/database';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, desc, eq, lte } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import type { OperationalActorContext } from '../operations/operational-controls.service';
import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';

const documentTypes = [
  'termsOfUse',
  'privacyNotice',
  'investmentRiskDisclosure',
  'dataSourceMethodologyNotice',
  'acceptableUsePolicy',
  'cookieConsentNotice',
  'accountDeletionDataExportNotice',
] as const;
const documentTypeSchema = z.enum(documentTypes);
const createDocumentSchema = z.object({
  content: z.string().min(1).max(262_144),
  documentType: documentTypeSchema,
  locale: z.enum(['tr-TR', 'en-US']),
  materialChange: z.boolean(),
  reason: z.string().trim().min(8).max(4_096),
  title: z.string().trim().min(1).max(240),
  version: z.number().int().positive(),
});
const reviewSchema = z.object({
  confirmation: z.literal('LEGAL_COUNSEL_APPROVED'),
  expectedVersion: z.number().int().positive(),
  legalApprovalReference: z.string().trim().min(8).max(240),
  reason: z.string().trim().min(8).max(4_096),
});
const publishSchema = z.object({
  effectiveAt: z.string().datetime(),
  expectedVersion: z.number().int().positive(),
  reason: z.string().trim().min(8).max(4_096),
});
const consentSchema = z.object({
  documentId: z.string().uuid(),
  locale: z.enum(['tr-TR', 'en-US']),
  source: z.enum(['registration', 'onboarding', 'settings', 'reconsent']),
});
const withdrawalSchema = z.object({
  documentId: z.string().uuid(),
  reason: z.string().trim().min(8).max(1_024),
});

const placeholderMarkers = [
  'LEGAL_REVIEW_REQUIRED',
  'NOT_FOR_PRODUCTION_PUBLICATION',
];

@Injectable()
export class LegalService {
  private readonly environment: string;

  constructor(
    private readonly connection: ApiDatabase,
    config: ConfigService,
  ) {
    this.environment = config.getOrThrow<string>('ATLAS_ENV');
  }

  async published(locale: string, now = new Date()) {
    const safeLocale = z.enum(['tr-TR', 'en-US']).parse(locale);
    const rows = await this.connection.database
      .select({
        content: legalDocuments.content,
        contentHash: legalDocuments.contentHash,
        documentType: legalDocuments.documentType,
        effectiveAt: legalDocuments.effectiveAt,
        id: legalDocuments.id,
        locale: legalDocuments.locale,
        materialChange: legalDocuments.materialChange,
        title: legalDocuments.title,
        version: legalDocuments.version,
      })
      .from(legalDocuments)
      .where(
        and(
          eq(legalDocuments.locale, safeLocale),
          eq(legalDocuments.status, 'published'),
          lte(legalDocuments.effectiveAt, now),
        ),
      )
      .orderBy(legalDocuments.documentType, desc(legalDocuments.version));
    const seen = new Set<string>();
    return rows.filter(({ documentType }) => {
      if (seen.has(documentType)) return false;
      seen.add(documentType);
      return true;
    });
  }

  async publishedByType(type: string, locale: string, now = new Date()) {
    const safeType = documentTypeSchema.parse(type);
    const documents = await this.published(locale, now);
    const document = documents.find(
      ({ documentType }) => documentType === safeType,
    );
    if (document === undefined) throw documentNotFound();
    return document;
  }

  async consent(userId: string, body: unknown, now = new Date()) {
    const input = parse(consentSchema, body);
    return this.connection.database.transaction(async (transaction) => {
      const [document] = await transaction
        .select()
        .from(legalDocuments)
        .where(
          and(
            eq(legalDocuments.id, input.documentId),
            eq(legalDocuments.locale, input.locale),
            eq(legalDocuments.status, 'published'),
            lte(legalDocuments.effectiveAt, now),
          ),
        )
        .limit(1);
      if (document === undefined) throw documentNotFound();
      const [record] = await transaction
        .insert(userDocumentConsents)
        .values({
          contentHash: document.contentHash,
          consentedAt: now,
          documentId: document.id,
          documentType: document.documentType,
          documentVersion: document.version,
          evidence: { policy: 'explicit-action-v1' },
          locale: document.locale,
          source: input.source,
          userId,
        })
        .onConflictDoNothing()
        .returning();
      if (record !== undefined) return record;
      const [existing] = await transaction
        .select()
        .from(userDocumentConsents)
        .where(
          and(
            eq(userDocumentConsents.userId, userId),
            eq(userDocumentConsents.documentId, document.id),
            eq(userDocumentConsents.action, 'accepted'),
          ),
        )
        .limit(1);
      return existing!;
    });
  }

  async consentHistory(userId: string, locale = 'tr-TR', now = new Date()) {
    const safeLocale = z.enum(['tr-TR', 'en-US']).parse(locale);
    const [history, current] = await Promise.all([
      this.connection.database
        .select()
        .from(userDocumentConsents)
        .where(eq(userDocumentConsents.userId, userId))
        .orderBy(desc(userDocumentConsents.consentedAt)),
      this.published(safeLocale, now),
    ]);
    const accepted = new Set(
      history
        .filter(({ action }) => action === 'accepted')
        .map(({ documentId }) => documentId),
    );
    return {
      history,
      reconsentRequired: current
        .filter(({ id, materialChange }) => materialChange && !accepted.has(id))
        .map(({ documentType, id, locale: documentLocale, version }) => ({
          documentId: id,
          documentType,
          locale: documentLocale,
          version,
        })),
    };
  }

  async withdraw(userId: string, body: unknown, now = new Date()) {
    const input = parse(withdrawalSchema, body);
    return this.connection.database.transaction(async (transaction) => {
      const [document] = await transaction
        .select()
        .from(legalDocuments)
        .where(eq(legalDocuments.id, input.documentId))
        .limit(1);
      if (document === undefined) throw documentNotFound();
      if (document.documentType !== 'cookieConsentNotice')
        throw invalid('WITHDRAWAL_NOT_APPLICABLE');
      const [accepted] = await transaction
        .select()
        .from(userDocumentConsents)
        .where(
          and(
            eq(userDocumentConsents.userId, userId),
            eq(userDocumentConsents.documentId, document.id),
            eq(userDocumentConsents.action, 'accepted'),
          ),
        )
        .limit(1);
      if (accepted === undefined) throw documentNotFound();
      const [withdrawn] = await transaction
        .insert(userDocumentConsents)
        .values({
          action: 'withdrawn',
          contentHash: accepted.contentHash,
          consentedAt: now,
          documentId: accepted.documentId,
          documentType: accepted.documentType,
          documentVersion: accepted.documentVersion,
          evidence: { reason: input.reason },
          locale: accepted.locale,
          source: 'settings',
          userId,
          withdrawnAt: now,
        })
        .onConflictDoNothing()
        .returning();
      return withdrawn ?? accepted;
    });
  }

  adminList() {
    return this.connection.database
      .select()
      .from(legalDocuments)
      .orderBy(
        legalDocuments.documentType,
        legalDocuments.locale,
        asc(legalDocuments.version),
      );
  }

  async create(actor: OperationalActorContext, body: unknown) {
    const input = parse(createDocumentSchema, body);
    const placeholder = hasPlaceholder(input.content);
    return this.connection.database.transaction(async (transaction) => {
      const [document] = await transaction
        .insert(legalDocuments)
        .values({
          content: input.content,
          contentHash: hash(input.content),
          createdByUserId: actor.userId,
          documentType: input.documentType,
          locale: input.locale,
          materialChange: input.materialChange,
          status: placeholder ? 'legalReviewRequired' : 'draft',
          title: input.title,
          version: input.version,
        })
        .returning();
      if (document === undefined)
        throw new Error('LEGAL_DOCUMENT_CREATE_FAILED');
      await this.audit(
        transaction,
        actor,
        'legal_document.created',
        input.reason,
        null,
        document,
      );
      return document;
    });
  }

  async approve(actor: OperationalActorContext, id: string, body: unknown) {
    const input = parse(reviewSchema, body);
    return this.connection.database.transaction(async (transaction) => {
      const current = await this.documentForUpdate(transaction, id);
      if (hasPlaceholder(current.content))
        throw invalid('PLACEHOLDER_CANNOT_BE_APPROVED');
      if (!['draft', 'legalReviewRequired'].includes(current.status))
        throw invalid('LEGAL_DOCUMENT_REVIEW_STATE_INVALID');
      const now = new Date();
      const [updated] = await transaction
        .update(legalDocuments)
        .set({
          legalReviewReference: input.legalApprovalReference,
          reviewedAt: now,
          reviewedByUserId: actor.userId,
          rowVersion: current.rowVersion + 1,
          status: 'approved',
          updatedAt: now,
        })
        .where(
          and(
            eq(legalDocuments.id, id),
            eq(legalDocuments.rowVersion, input.expectedVersion),
          ),
        )
        .returning();
      if (updated === undefined) throw versionConflict(current.rowVersion);
      await this.audit(
        transaction,
        actor,
        'legal_document.approved',
        input.reason,
        current,
        updated,
      );
      return updated;
    });
  }

  async publish(actor: OperationalActorContext, id: string, body: unknown) {
    const input = parse(publishSchema, body);
    return this.connection.database.transaction(async (transaction) => {
      const current = await this.documentForUpdate(transaction, id);
      if (
        current.status !== 'approved' ||
        current.reviewedAt === null ||
        current.legalReviewReference === null ||
        hasPlaceholder(current.content)
      )
        throw invalid('LEGAL_REVIEW_APPROVAL_REQUIRED');
      const now = new Date();
      const effectiveAt = new Date(input.effectiveAt);
      const [updated] = await transaction
        .update(legalDocuments)
        .set({
          effectiveAt,
          publishedAt: now,
          publishedByUserId: actor.userId,
          rowVersion: current.rowVersion + 1,
          status: 'published',
          updatedAt: now,
        })
        .where(
          and(
            eq(legalDocuments.id, id),
            eq(legalDocuments.rowVersion, input.expectedVersion),
          ),
        )
        .returning();
      if (updated === undefined) throw versionConflict(current.rowVersion);
      await this.audit(
        transaction,
        actor,
        'legal_document.published',
        input.reason,
        current,
        updated,
      );
      return updated;
    });
  }

  private async documentForUpdate(
    transaction: Parameters<
      Parameters<ApiDatabase['database']['transaction']>[0]
    >[0],
    id: string,
  ) {
    const [document] = await transaction
      .select()
      .from(legalDocuments)
      .where(eq(legalDocuments.id, id))
      .limit(1);
    if (document === undefined) throw documentNotFound();
    return document;
  }

  private audit(
    transaction: Parameters<
      Parameters<ApiDatabase['database']['transaction']>[0]
    >[0],
    actor: OperationalActorContext,
    action: string,
    reason: string,
    beforeState: unknown,
    afterState: unknown,
  ) {
    return transaction.insert(operationalAuditEvents).values({
      action,
      actorType: 'operations_admin',
      actorUserId: actor.userId,
      afterState: auditSnapshot(afterState),
      beforeState: auditSnapshot(beforeState),
      correlationId: actor.correlationId,
      environment: this.environment,
      reason,
      requestId: actor.requestId,
      resourceId:
        typeof afterState === 'object' &&
        afterState !== null &&
        'id' in afterState &&
        typeof afterState.id === 'string'
          ? afterState.id
          : null,
      resourceType: 'legal_document',
    });
  }
}

function auditSnapshot(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value;
  const record = value as Record<string, unknown>;
  return {
    contentHash: record['contentHash'],
    documentType: record['documentType'],
    id: record['id'],
    locale: record['locale'],
    rowVersion: record['rowVersion'],
    status: record['status'],
    version: record['version'],
  };
}

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw invalid('LEGAL_REQUEST_INVALID');
  return result.data;
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hasPlaceholder(content: string): boolean {
  return placeholderMarkers.some((marker) => content.includes(marker));
}

function invalid(code: string) {
  return new BadRequestException({ code, message: 'Legal request is invalid' });
}

function documentNotFound() {
  return new NotFoundException({
    code: 'LEGAL_DOCUMENT_NOT_FOUND',
    message: 'Legal document was not found',
  });
}

function versionConflict(currentVersion: number) {
  return new ConflictException({
    code: 'LEGAL_DOCUMENT_VERSION_CONFLICT',
    details: { currentVersion },
    message: 'Legal document was changed by another request',
  });
}
