import { createHmac } from 'node:crypto';

import { PostgresRecoveryRepository } from '@atlas/database';
import {
  AccountDeletionService as AccountDeletionApplication,
  RecoveryPolicyError,
} from '@atlas/domain';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';

@Injectable()
export class AccountDeletionService {
  private readonly application: AccountDeletionApplication;
  private readonly connection: ApiDatabase;

  constructor(connection: ApiDatabase, config: ConfigService) {
    this.connection = connection;
    const environment = config.getOrThrow<string>('ATLAS_ENV');
    const hmacKey = config.getOrThrow<string>('AUTH_SESSION_HMAC_KEY');
    const repository = new PostgresRecoveryRepository(
      connection.pool,
      environment,
    );
    this.application = new AccountDeletionApplication(repository, (value) =>
      createHmac('sha256', hmacKey).update(value, 'utf8').digest('hex'),
    );
  }

  async request(userId: string, body: unknown) {
    const idempotencyKey = deletionInput(body);
    try {
      return await this.application.request(
        { isOperationsAdmin: false, userId },
        userId,
        idempotencyKey,
      );
    } catch (error: unknown) {
      if (
        error instanceof RecoveryPolicyError &&
        error.code === 'ACCOUNT_DELETION_ACCESS_DENIED'
      )
        throw new ForbiddenException({
          code: error.code,
          message: 'Account deletion is not allowed',
        });
      if (
        error instanceof RecoveryPolicyError &&
        error.code === 'ACCOUNT_DELETION_IDEMPOTENCY_CONFLICT'
      )
        throw new ConflictException({
          code: error.code,
          message: 'Idempotency key conflicts with another request',
        });
      throw error;
    }
  }

  async cancelByAdmin(
    actorUserId: string,
    requestId: string,
    reason: unknown,
    now = new Date(),
  ) {
    if (typeof reason !== 'string' || reason.trim().length < 8)
      throw new ConflictException({
        code: 'ACCOUNT_DELETION_CANCEL_REASON_INVALID',
        message: 'A cancellation reason is required',
      });
    const client = await this.connection.pool.connect();
    try {
      await client.query('begin');
      const request = await client.query<{ user_id: string }>(
        `update account_deletion_requests
         set status = 'cancelled', completed_at = $2
         where id = $1 and status = 'disabled' and grace_until > $2
         returning user_id`,
        [requestId, now],
      );
      const userId = request.rows[0]?.user_id;
      if (!userId)
        throw new ConflictException({
          code: 'ACCOUNT_DELETION_NOT_CANCELLABLE',
          message: 'Deletion request cannot be cancelled',
        });
      await client.query(
        `update security_users
         set account_status = 'active', session_version = session_version + 1,
             updated_at = $2
         where id = $1 and account_status = 'disabled'`,
        [userId, now],
      );
      await client.query(
        `insert into operational_audit_events
          (environment, actor_type, actor_user_id, action, resource_type,
           resource_id, before_state, after_state, request_id, correlation_id)
         values ($1, 'admin', $2, 'account.deletion.cancelled',
                 'account_deletion_request', $3::varchar, '{"status":"disabled"}',
                 jsonb_build_object('status','cancelled','reason',$4::text),
                 $3::varchar, $3::varchar)`,
        [process.env['ATLAS_ENV'] ?? 'local', actorUserId, requestId, reason],
      );
      await client.query('commit');
      return { id: requestId, status: 'cancelled' };
    } catch (error: unknown) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}

function deletionInput(value: unknown): string {
  if (value === null || typeof value !== 'object')
    throw new ConflictException({
      code: 'ACCOUNT_DELETION_REQUEST_INVALID',
      message: 'A valid deletion request is required',
    });
  const idempotencyKey = (value as Record<string, unknown>)['idempotencyKey'];
  if (
    typeof idempotencyKey !== 'string' ||
    idempotencyKey.length < 8 ||
    idempotencyKey.length > 160
  )
    throw new ConflictException({
      code: 'ACCOUNT_DELETION_REQUEST_INVALID',
      message: 'A valid deletion request is required',
    });
  return idempotencyKey;
}
