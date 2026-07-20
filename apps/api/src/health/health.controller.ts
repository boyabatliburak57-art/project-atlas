import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { getRequestId } from '../common/http/request-context';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: 'Process liveness probe' })
  @ApiOkResponse({ description: 'API process is alive' })
  live(@Req() request: Request) {
    return {
      data: { status: this.health.live() },
      meta: { requestId: getRequestId(request) },
    } as const;
  }

  @Get('ready')
  @ApiOperation({ summary: 'Application readiness probe' })
  @ApiOkResponse({
    description: 'Configured application dependencies are ready',
  })
  async ready(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const status = await this.health.ready();
    if (status !== 'ready') response.status(503);
    return {
      data: { status },
      meta: { requestId: getRequestId(request) },
    } as const;
  }

  @Get('startup')
  @ApiOperation({ summary: 'Application startup probe' })
  @ApiOkResponse({ description: 'API startup has completed' })
  startup(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const status = this.health.startup();
    if (status !== 'started') response.status(503);
    return {
      data: { status },
      meta: { requestId: getRequestId(request) },
    } as const;
  }
}
