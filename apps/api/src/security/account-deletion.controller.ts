import {
  Body,
  Controller,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';

import { AccountDeletionService } from './account-deletion.service';
import {
  requireOperationsPrincipal,
  SECURITY_PRINCIPAL_RESOLVER,
  type SecurityPrincipalResolver,
} from './security-principal';

@Controller('account/deletion')
export class AccountDeletionController {
  constructor(private readonly service: AccountDeletionService) {}

  @Post()
  async requestDeletion(@Req() request: Request, @Body() body: unknown) {
    if (request.authenticatedUserId === undefined)
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required',
      });
    return {
      data: await this.service.request(request.authenticatedUserId, body),
    };
  }
}

@Controller('admin/account/deletion')
export class AccountDeletionAdminController {
  constructor(
    private readonly service: AccountDeletionService,
    @Inject(SECURITY_PRINCIPAL_RESOLVER)
    private readonly principal: SecurityPrincipalResolver,
    private readonly config: ConfigService,
  ) {}

  @Post(':id/cancel')
  async cancel(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const principal = requireOperationsPrincipal(
      request,
      this.principal,
      this.config.getOrThrow<number>('AUTH_REAUTH_MAX_AGE_SECONDS'),
    );
    const reason =
      body !== null && typeof body === 'object'
        ? (body as Record<string, unknown>)['reason']
        : undefined;
    return {
      data: await this.service.cancelByAdmin(principal.userId, id, reason),
    };
  }
}
