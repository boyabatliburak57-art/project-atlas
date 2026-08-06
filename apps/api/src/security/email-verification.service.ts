import { emailVerificationTokens, securityUsers } from '@atlas/database';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import { hashToken, randomSecurityToken } from './security-crypto';
import {
  EMAIL_VERIFICATION_DELIVERY,
  type EmailVerificationDelivery,
} from './email-verification-delivery';

const confirmInput = z.object({ token: z.string().min(32).max(512) });
const TOKEN_TTL_MS = 24 * 60 * 60 * 1_000;
const RESEND_COOLDOWN_MS = 15 * 60 * 1_000;

export interface EmailVerificationStatus {
  readonly deliveryMode: 'SANDBOX_INTEGRATION';
  readonly maskedEmail: string;
  readonly reasonCode: 'EMAIL_ALREADY_VERIFIED' | 'EMAIL_VERIFICATION_REQUIRED';
  readonly required: true;
  readonly resendAvailableAt: string | null;
  readonly verified: boolean;
  readonly verifiedAt: string | null;
}

@Injectable()
export class EmailVerificationService {
  constructor(
    @Inject(ApiDatabase)
    private readonly connection: ApiDatabase,
    @Inject(EMAIL_VERIFICATION_DELIVERY)
    private readonly delivery: EmailVerificationDelivery,
  ) {}

  async status(userId: string): Promise<EmailVerificationStatus> {
    const user = await this.user(userId);
    const recent = await this.connection.database
      .select({ createdAt: emailVerificationTokens.createdAt })
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.userId, userId))
      .orderBy(desc(emailVerificationTokens.createdAt))
      .limit(1);
    return {
      deliveryMode: 'SANDBOX_INTEGRATION',
      maskedEmail: maskEmail(user.email),
      reasonCode:
        user.emailVerifiedAt === null
          ? 'EMAIL_VERIFICATION_REQUIRED'
          : 'EMAIL_ALREADY_VERIFIED',
      required: true,
      resendAvailableAt:
        recent[0] === undefined
          ? null
          : new Date(
              recent[0].createdAt.getTime() + RESEND_COOLDOWN_MS,
            ).toISOString(),
      verified: user.emailVerifiedAt !== null,
      verifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    };
  }

  async resend(
    userId: string,
    now = new Date(),
  ): Promise<{ readonly accepted: true; readonly resendAvailableAt: string }> {
    const user = await this.user(userId);
    if (user.emailVerifiedAt !== null)
      return {
        accepted: true,
        resendAvailableAt: now.toISOString(),
      };
    const recent = await this.connection.database
      .select({ createdAt: emailVerificationTokens.createdAt })
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.userId, userId))
      .orderBy(desc(emailVerificationTokens.createdAt))
      .limit(1);
    if (
      recent[0] !== undefined &&
      recent[0].createdAt.getTime() + RESEND_COOLDOWN_MS > now.getTime()
    )
      throw new HttpException(
        {
          code: 'VERIFICATION_RATE_LIMITED',
          message: 'Verification request is rate limited',
          resendAvailableAt: new Date(
            recent[0].createdAt.getTime() + RESEND_COOLDOWN_MS,
          ).toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const token = randomSecurityToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
    await this.connection.database.transaction(async (transaction) => {
      await transaction
        .update(emailVerificationTokens)
        .set({ revokedAt: now })
        .where(
          and(
            eq(emailVerificationTokens.userId, userId),
            isNull(emailVerificationTokens.consumedAt),
            isNull(emailVerificationTokens.revokedAt),
          ),
        );
      await transaction.insert(emailVerificationTokens).values({
        createdAt: now,
        emailVerificationVersion: user.emailVerificationVersion,
        expiresAt,
        tokenHash,
        userId,
      });
    });
    try {
      await this.delivery.deliver({
        expiresAt,
        locale: 'tr-TR',
        recipient: user.email,
        token,
      });
    } catch (error) {
      await this.connection.database
        .update(emailVerificationTokens)
        .set({ revokedAt: now })
        .where(eq(emailVerificationTokens.tokenHash, tokenHash));
      throw error;
    }
    return {
      accepted: true,
      resendAvailableAt: new Date(
        now.getTime() + RESEND_COOLDOWN_MS,
      ).toISOString(),
    };
  }

  async confirm(
    body: unknown,
    sessionUserId: string | undefined,
    now = new Date(),
  ): Promise<{ readonly alreadyVerified: boolean; readonly verified: true }> {
    const parsed = confirmInput.safeParse(body);
    if (!parsed.success) throw verificationError('VERIFICATION_TOKEN_INVALID');
    const tokenHash = hashToken(parsed.data.token);
    return this.connection.database.transaction(async (transaction) => {
      const rows = await transaction
        .select({ token: emailVerificationTokens, user: securityUsers })
        .from(emailVerificationTokens)
        .innerJoin(
          securityUsers,
          eq(securityUsers.id, emailVerificationTokens.userId),
        )
        .where(eq(emailVerificationTokens.tokenHash, tokenHash))
        .limit(1);
      const row = rows[0];
      if (row === undefined)
        throw verificationError('VERIFICATION_TOKEN_INVALID');
      if (sessionUserId !== undefined && sessionUserId !== row.user.id)
        throw new UnauthorizedException({
          code: 'VERIFICATION_ACCOUNT_MISMATCH',
          message: 'Verification context does not match the account',
        });
      if (row.user.emailVerifiedAt !== null)
        return { alreadyVerified: true, verified: true };
      if (row.token.consumedAt !== null)
        throw verificationError('VERIFICATION_TOKEN_USED');
      if (row.token.revokedAt !== null)
        throw verificationError('VERIFICATION_TOKEN_INVALID');
      if (row.token.expiresAt <= now)
        throw verificationError('VERIFICATION_TOKEN_EXPIRED');
      if (
        row.token.emailVerificationVersion !== row.user.emailVerificationVersion
      )
        throw verificationError('VERIFICATION_TOKEN_INVALID');
      const consumed = await transaction
        .update(emailVerificationTokens)
        .set({ consumedAt: now })
        .where(
          and(
            eq(emailVerificationTokens.id, row.token.id),
            isNull(emailVerificationTokens.consumedAt),
            isNull(emailVerificationTokens.revokedAt),
          ),
        )
        .returning({ id: emailVerificationTokens.id });
      if (consumed.length !== 1)
        throw new ConflictException({
          code: 'VERIFICATION_TOKEN_USED',
          message: 'Verification token was already used',
        });
      await transaction
        .update(securityUsers)
        .set({ emailVerifiedAt: now, updatedAt: now })
        .where(
          and(
            eq(securityUsers.id, row.user.id),
            sql`${securityUsers.emailVerifiedAt} is null`,
          ),
        );
      return { alreadyVerified: false, verified: true };
    });
  }

  private async user(userId: string) {
    const rows = await this.connection.database
      .select({
        email: securityUsers.email,
        emailVerificationVersion: securityUsers.emailVerificationVersion,
        emailVerifiedAt: securityUsers.emailVerifiedAt,
      })
      .from(securityUsers)
      .where(eq(securityUsers.id, userId))
      .limit(1);
    if (rows[0] === undefined)
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required',
      });
    return rows[0];
  }
}

function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(2, local.length - 1))}@${domain}`;
}

function verificationError(code: string): BadRequestException {
  return new BadRequestException({
    code,
    message: 'E-mail verification could not be completed',
  });
}
