import type { Request } from 'express';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiForbiddenResponse, ApiTags } from '@nestjs/swagger';

import { getCorrelationId, getRequestId } from '../common/http/request-context';
import {
  requireOperationsPrincipal,
  SECURITY_PRINCIPAL_RESOLVER,
  type SecurityPrincipalResolver,
} from '../security/security-principal';
import { DataOperationsService } from './data-operations.service';

const allowedTransitions = new Set([
  'investigating',
  'approved',
  'rejected',
  'replayQueued',
  'replaying',
  'resolved',
  'failed',
]);

@ApiTags('Data Operations Admin')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Operations role is required' })
@Controller('admin/data-operations')
export class DataOperationsController {
  constructor(
    private readonly dataOperations: DataOperationsService,
    @Inject(SECURITY_PRINCIPAL_RESOLVER)
    private readonly resolvePrincipal: SecurityPrincipalResolver,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async overview(@Req() request: Request) {
    this.actor(request);
    return this.response(request, await this.dataOperations.overview());
  }

  @Post('corrections')
  async create(@Req() request: Request, @Body() body: unknown) {
    return this.response(
      request,
      await this.dataOperations.createCorrection(this.actor(request), body),
    );
  }

  @Post('corrections/:id/:transition')
  async transition(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('transition') transition: string,
    @Body() body: unknown,
  ) {
    if (!allowedTransitions.has(transition))
      throw new BadRequestException({
        code: 'DATA_CORRECTION_TRANSITION_NOT_ALLOWLISTED',
        message: 'Correction transition is not allowlisted',
      });
    return this.response(
      request,
      await this.dataOperations.transition(
        this.actor(request),
        id,
        transition as
          | 'investigating'
          | 'approved'
          | 'rejected'
          | 'replayQueued'
          | 'replaying'
          | 'resolved'
          | 'failed',
        body,
      ),
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

  private response(request: Request, data: unknown) {
    return { data, meta: { requestId: getRequestId(request) } };
  }
}
