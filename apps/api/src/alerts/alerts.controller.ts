import type { Request } from 'express';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import {
  AUTHENTICATED_USER_RESOLVER,
  type AuthenticatedUserResolver,
} from '../common/auth/authenticated-user';
import { getRequestId } from '../common/http/request-context';
import {
  AlertDryRunResponseDto,
  AlertHistoryResponseDto,
  AlertListQueryDto,
  AlertListResponseDto,
  AlertResponseDto,
  CreateAlertDto,
  HistoryQueryDto,
  UpdateAlertDto,
} from './alerts.dto';
import { AlertsService } from './alerts.service';

@ApiTags('Alerts')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication is required' })
@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly service: AlertsService,
    @Inject(AUTHENTICATED_USER_RESOLVER)
    private readonly authenticatedUser: AuthenticatedUserResolver,
  ) {}

  @Get()
  @ApiOkResponse({ type: AlertListResponseDto })
  async list(@Req() request: Request, @Query() query: AlertListQueryDto) {
    const result = await this.service.list(
      this.authenticatedUser(request),
      query,
    );
    return {
      data: result.items,
      meta: { requestId: getRequestId(request), nextCursor: result.nextCursor },
    };
  }

  @Post()
  @ApiCreatedResponse({ type: AlertResponseDto })
  async create(@Req() request: Request, @Body() body: CreateAlertDto) {
    return this.response(
      request,
      await this.service.create(this.authenticatedUser(request), body),
    );
  }

  @Get(':id')
  @ApiOkResponse({ type: AlertResponseDto })
  @ApiForbiddenResponse({ description: 'Alert belongs to another user' })
  async get(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      await this.service.get(this.authenticatedUser(request), id),
    );
  }

  @Patch(':id')
  @ApiOkResponse({ type: AlertResponseDto })
  @ApiConflictResponse({ description: 'Expected revision is stale' })
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: UpdateAlertDto,
  ) {
    return this.response(
      request,
      await this.service.update(this.authenticatedUser(request), id, body),
    );
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Soft-delete an owned alert' })
  @ApiOkResponse({ type: AlertResponseDto })
  async delete(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      await this.service.delete(this.authenticatedUser(request), id),
    );
  }

  @Post(':id/pause')
  @HttpCode(200)
  @ApiOkResponse({ type: AlertResponseDto })
  async pause(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      await this.service.pause(this.authenticatedUser(request), id),
    );
  }

  @Post(':id/resume')
  @HttpCode(200)
  @ApiOkResponse({ type: AlertResponseDto })
  async resume(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      await this.service.resume(this.authenticatedUser(request), id),
    );
  }

  @Get(':id/revisions')
  @ApiOkResponse({ type: AlertHistoryResponseDto })
  async revisions(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      await this.service.revisions(this.authenticatedUser(request), id),
    );
  }

  @Get(':id/evaluations')
  @ApiOkResponse({ type: AlertHistoryResponseDto })
  async evaluations(
    @Req() request: Request,
    @Param('id') id: string,
    @Query() query: HistoryQueryDto,
  ) {
    const result = await this.service.evaluations(
      this.authenticatedUser(request),
      id,
      query,
    );
    return {
      data: result.items,
      meta: { requestId: getRequestId(request), nextCursor: result.nextCursor },
    };
  }

  @Get(':id/triggers')
  @ApiOkResponse({ type: AlertHistoryResponseDto })
  async triggers(
    @Req() request: Request,
    @Param('id') id: string,
    @Query() query: HistoryQueryDto,
  ) {
    const result = await this.service.triggers(
      this.authenticatedUser(request),
      id,
      query,
    );
    return {
      data: result.items,
      meta: { requestId: getRequestId(request), nextCursor: result.nextCursor },
    };
  }

  @Post(':id/test')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Evaluate without trigger, notification or delivery side effects',
  })
  @ApiOkResponse({ type: AlertDryRunResponseDto })
  async dryRun(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      await this.service.dryRun(this.authenticatedUser(request), id),
    );
  }

  private response(request: Request, data: unknown) {
    return { data, meta: { requestId: getRequestId(request) } };
  }
}
