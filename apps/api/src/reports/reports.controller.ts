import type { Request } from 'express';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { getRequestId } from '../common/http/request-context';
import {
  SECURITY_PRINCIPAL_RESOLVER,
  type SecurityPrincipalResolver,
} from '../security/security-principal';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication is required' })
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly service: ReportsService,
    @Inject(SECURITY_PRINCIPAL_RESOLVER)
    private readonly principal: SecurityPrincipalResolver,
  ) {}

  @Get()
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  list(@Req() request: Request, @Query() query: Record<string, unknown>) {
    return this.response(
      request,
      this.service.list(this.principal(request).userId, query),
    );
  }

  @Post()
  create(@Req() request: Request, @Body() body: unknown) {
    const principal = this.principal(request);
    return this.response(
      request,
      this.service.create(principal.userId, principal.roles, body),
    );
  }

  @Get(':id')
  get(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      this.service.get(this.principal(request).userId, id),
    );
  }

  @Delete(':id')
  delete(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      this.service.delete(this.principal(request).userId, id),
    );
  }

  @Post(':id/cancel')
  cancel(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      this.service.cancel(this.principal(request).userId, id),
    );
  }

  @Get(':id/download')
  @ApiQuery({ name: 'token', required: false })
  @ApiOkResponse({ description: 'Short-lived link or report file' })
  async download(
    @Req() request: Request,
    @Param('id') id: string,
    @Query('token') token?: string,
  ) {
    const userId = this.principal(request).userId;
    if (token === undefined)
      return this.response(request, this.service.downloadLink(userId, id));
    const artifact = await this.service.download(userId, id, token);
    return new StreamableFile(artifact.bytes, {
      disposition: `attachment; filename="${artifact.filename}"`,
      type: artifact.contentType,
    });
  }

  private async response(request: Request, promise: Promise<unknown>) {
    return { data: await promise, meta: { requestId: getRequestId(request) } };
  }
}
