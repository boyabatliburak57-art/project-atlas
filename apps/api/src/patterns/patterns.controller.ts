import type { Request } from 'express';
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { getRequestId } from '../common/http/request-context';
import { PatternQueryDto } from './patterns.dto';
import { PatternsService } from './patterns.service';

@ApiTags('Technical Patterns')
@Controller()
export class PatternsController {
  constructor(
    @Inject(PatternsService) private readonly service: PatternsService,
  ) {}
  @Get('patterns/catalog')
  @ApiOperation({ summary: 'List versioned pattern definitions' })
  @ApiOkResponse({ type: Object })
  async catalog(@Req() req: Request) {
    return this.wrap(req, await this.service.catalog(this.key(req)));
  }
  @Get('symbols/:symbol/patterns')
  @ApiParam({ name: 'symbol', example: 'THYAO' })
  @ApiOperation({ summary: 'List pattern instances for a symbol' })
  @ApiOkResponse({ type: Object })
  async symbol(
    @Req() req: Request,
    @Param('symbol') symbol: string,
    @Query() query: PatternQueryDto,
  ) {
    return this.wrap(
      req,
      await this.service.symbol(this.key(req), symbol, query),
    );
  }
  @Get('market/patterns')
  @ApiOperation({ summary: 'List latest market pattern instances' })
  @ApiOkResponse({ type: Object })
  async market(@Req() req: Request, @Query() query: PatternQueryDto) {
    return this.wrap(req, await this.service.market(this.key(req), query));
  }
  private wrap(
    req: Request,
    value: { data: unknown; meta: Record<string, unknown> },
  ) {
    return {
      data: value.data,
      meta: { requestId: getRequestId(req), ...value.meta },
    };
  }
  private key(req: Request) {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}
