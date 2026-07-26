import type { Request } from 'express';
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

import { getCorrelationId, getRequestId } from '../common/http/request-context';
import {
  requireOperationsPrincipal,
  SECURITY_PRINCIPAL_RESOLVER,
  type SecurityPrincipalResolver,
} from '../security/security-principal';
import { SupportService } from './support.service';

@ApiTags('Support')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication is required' })
@Controller('support/requests')
export class SupportController {
  constructor(
    private readonly support: SupportService,
    @Inject(SECURITY_PRINCIPAL_RESOLVER)
    private readonly principal: SecurityPrincipalResolver,
  ) {}

  @Post()
  async create(@Req() request: Request, @Body() body: unknown) {
    return this.response(
      request,
      await this.support.create(
        this.principal(request).userId,
        getCorrelationId(request),
        body,
      ),
    );
  }

  @Get()
  async list(@Req() request: Request) {
    return this.response(
      request,
      await this.support.list(this.principal(request).userId),
    );
  }

  @Get(':id')
  async detail(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      await this.support.detail(this.principal(request).userId, id),
    );
  }

  @Post(':id/messages')
  async message(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.response(
      request,
      await this.support.message(this.principal(request).userId, id, body),
    );
  }

  @Post(':id/attachments')
  async attach(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.response(
      request,
      await this.support.attach(this.principal(request).userId, id, body),
    );
  }

  private response(request: Request, data: unknown) {
    return { data, meta: { requestId: getRequestId(request) } };
  }
}

@ApiTags('Support Admin')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Operations role is required' })
@Controller('admin/support/requests')
export class SupportAdminController {
  constructor(
    private readonly support: SupportService,
    @Inject(SECURITY_PRINCIPAL_RESOLVER)
    private readonly principal: SecurityPrincipalResolver,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async list(@Req() request: Request) {
    this.admin(request);
    return this.response(request, await this.support.adminList());
  }

  @Post(':id/actions')
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const principal = this.admin(request);
    return this.response(
      request,
      await this.support.adminUpdate(
        principal.userId,
        getCorrelationId(request),
        id,
        body,
      ),
    );
  }

  private admin(request: Request) {
    return requireOperationsPrincipal(
      request,
      this.principal,
      this.config.getOrThrow<number>('AUTH_REAUTH_MAX_AGE_SECONDS'),
    );
  }

  private response(request: Request, data: unknown) {
    return { data, meta: { requestId: getRequestId(request) } };
  }
}
