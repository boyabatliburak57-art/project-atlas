import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';

import {
  AUTHENTICATED_USER_RESOLVER,
  type AuthenticatedUserResolver,
} from '../common/auth/authenticated-user';
import { getCorrelationId, getRequestId } from '../common/http/request-context';
import {
  requireOperationsPrincipal,
  SECURITY_PRINCIPAL_RESOLVER,
  type SecurityPrincipalResolver,
} from '../security/security-principal';
import { LegalService } from './legal.service';

@ApiTags('Legal Documents and Consent')
@Controller('legal')
export class LegalController {
  constructor(
    private readonly legal: LegalService,
    @Inject(AUTHENTICATED_USER_RESOLVER)
    private readonly authenticatedUser: AuthenticatedUserResolver,
  ) {}

  @Get('documents')
  async documents(@Req() request: Request, @Query('locale') locale = 'tr-TR') {
    return response(request, await this.legal.published(locale));
  }

  @Get('documents/:type')
  async document(
    @Req() request: Request,
    @Param('type') type: string,
    @Query('locale') locale = 'tr-TR',
  ) {
    return response(request, await this.legal.publishedByType(type, locale));
  }

  @Post('consents')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Authentication is required' })
  async consent(@Req() request: Request, @Body() body: unknown) {
    return response(
      request,
      await this.legal.consent(this.authenticatedUser(request), body),
    );
  }

  @Post('consents/withdraw')
  @ApiBearerAuth()
  async withdraw(@Req() request: Request, @Body() body: unknown) {
    return response(
      request,
      await this.legal.withdraw(this.authenticatedUser(request), body),
    );
  }
}

@ApiTags('Legal Consent History')
@ApiBearerAuth()
@Controller('me/consents')
export class ConsentHistoryController {
  constructor(
    private readonly legal: LegalService,
    @Inject(AUTHENTICATED_USER_RESOLVER)
    private readonly authenticatedUser: AuthenticatedUserResolver,
  ) {}

  @Get()
  async history(@Req() request: Request, @Query('locale') locale = 'tr-TR') {
    return response(
      request,
      await this.legal.consentHistory(this.authenticatedUser(request), locale),
    );
  }
}

@ApiTags('Legal Document Administration')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Operations role is required' })
@Controller('admin/legal/documents')
export class LegalAdminController {
  constructor(
    private readonly legal: LegalService,
    @Inject(SECURITY_PRINCIPAL_RESOLVER)
    private readonly resolvePrincipal: SecurityPrincipalResolver,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async list(@Req() request: Request) {
    this.actor(request);
    return response(request, await this.legal.adminList());
  }

  @Post()
  async create(@Req() request: Request, @Body() body: unknown) {
    return response(
      request,
      await this.legal.create(this.actor(request), body),
    );
  }

  @Post(':id/approve')
  async approve(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return response(
      request,
      await this.legal.approve(this.actor(request), id, body),
    );
  }

  @Post(':id/publish')
  async publish(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return response(
      request,
      await this.legal.publish(this.actor(request), id, body),
    );
  }

  private actor(request: Request) {
    const principal = requireOperationsPrincipal(
      request,
      this.resolvePrincipal,
      this.config.getOrThrow<number>('AUTH_REAUTH_MAX_AGE_SECONDS'),
    );
    return {
      correlationId: getCorrelationId(request),
      requestId: getRequestId(request),
      userId: principal.userId,
    };
  }
}

function response(request: Request, data: unknown) {
  return { data, meta: { requestId: getRequestId(request) } };
}
