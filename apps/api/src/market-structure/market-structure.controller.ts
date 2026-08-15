import type { Request } from 'express';
import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { getRequestId } from '../common/http/request-context';
import { MarketStructureService } from './market-structure.service';

@ApiTags('BIST Market Structure')
@ApiBearerAuth()
@Controller()
export class MarketStructureController {
  constructor(private readonly service: MarketStructureService) {}
  @Get('market-structure/instruments/:symbol/active')
  @ApiOperation({
    summary: 'Get point-in-time safe active market measures for an instrument',
  })
  @ApiOkResponse({
    description: 'Canonical active measures with provider and license metadata',
  })
  active(@Req() req: Request, @Param('symbol') symbol: string) {
    return this.wrap(req, this.service.active(this.key(req), symbol));
  }
  @Get('market-structure/instruments/:symbol/history') history(
    @Req() req: Request,
    @Param('symbol') symbol: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.wrap(req, this.service.history(this.key(req), symbol, query));
  }
  @Get('market-structure/measures') marketWide(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    return this.wrap(req, this.service.marketWide(this.key(req), query));
  }
  @Get('market-structure/instruments/:symbol/short-selling') shortSelling(
    @Req() req: Request,
    @Param('symbol') symbol: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.wrap(
      req,
      this.service.shortSelling(this.key(req), symbol, query),
    );
  }
  @Get('symbols/:symbol/market-structure') summary(
    @Req() req: Request,
    @Param('symbol') symbol: string,
  ) {
    return this.wrap(req, this.service.summary(this.key(req), symbol));
  }
  private async wrap(
    req: Request,
    result: Promise<{ data: unknown; meta: unknown }>,
  ) {
    const resolved = await result;
    return {
      data: resolved.data,
      meta: { requestId: getRequestId(req), ...(resolved.meta as object) },
    };
  }
  private key(req: Request) {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}
