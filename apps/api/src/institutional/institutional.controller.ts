import type { Request } from 'express';
import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { getRequestId } from '../common/http/request-context';
import { InstitutionalService } from './institutional.service';

@ApiTags('Institutional Intelligence')
@ApiBearerAuth()
@Controller()
export class InstitutionalController {
  constructor(private readonly service: InstitutionalService) {}

  @Get('institutions')
  @ApiOperation({
    summary: 'Search canonical institutions without provider identifiers',
  })
  @ApiOkResponse({ description: 'Bounded canonical institution results' })
  search(@Req() request: Request, @Query() query: Record<string, unknown>) {
    return this.wrap(
      request,
      this.service.search(this.clientKey(request), query),
    );
  }
  @Get('institutional/overview')
  overview(@Req() request: Request, @Query() query: Record<string, unknown>) {
    return this.wrap(
      request,
      this.service.overview(this.clientKey(request), query),
    );
  }
  @Get('institutional/instruments/:symbol/flow')
  flow(
    @Req() request: Request,
    @Param('symbol') symbol: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.wrap(
      request,
      this.service.instrumentFlow(this.clientKey(request), symbol, query),
    );
  }
  @Get('institutions/:id')
  institution(
    @Req() request: Request,
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.wrap(
      request,
      this.service.institution(this.clientKey(request), id, query),
    );
  }
  @Get('settlement/instruments/:symbol')
  settlement(
    @Req() request: Request,
    @Param('symbol') symbol: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.wrap(
      request,
      this.service.settlement(this.clientKey(request), symbol, query),
    );
  }
  @Get('settlement/instruments/:symbol/history')
  settlementHistory(
    @Req() request: Request,
    @Param('symbol') symbol: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.wrap(
      request,
      this.service.settlementHistory(this.clientKey(request), symbol, query),
    );
  }
  @Get('settlement/instruments/:symbol/foreign')
  foreignSettlement(
    @Req() request: Request,
    @Param('symbol') symbol: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.wrap(
      request,
      this.service.foreignSettlement(this.clientKey(request), symbol, query),
    );
  }
  @Get('settlement/institutions/:id')
  institutionHoldings(
    @Req() request: Request,
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.wrap(
      request,
      this.service.institutionHoldings(this.clientKey(request), id, query),
    );
  }
  @Get('symbols/:symbol/institutional')
  companySummary(@Req() request: Request, @Param('symbol') symbol: string) {
    return this.wrap(
      request,
      this.service.companySummary(this.clientKey(request), symbol),
    );
  }
  private async wrap(
    request: Request,
    result: Promise<{ data: unknown; meta: unknown }>,
  ) {
    const resolved = await result;
    return {
      data: resolved.data,
      meta: { requestId: getRequestId(request), ...(resolved.meta as object) },
    };
  }
  private clientKey(request: Request) {
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}
