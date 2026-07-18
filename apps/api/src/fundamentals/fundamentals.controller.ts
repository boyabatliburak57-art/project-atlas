import type { Request } from 'express';
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { getRequestId } from '../common/http/request-context';
import { FundamentalsQueryDto } from './fundamentals.dto';
import { FundamentalsService } from './fundamentals.service';

@ApiTags('Fundamentals')
@ApiParam({ name: 'symbol', example: 'THYAO' })
@ApiNotFoundResponse({
  description: 'Symbol or fundamental data was not found',
})
@Controller('symbols/:symbol')
export class FundamentalsController {
  constructor(
    @Inject(FundamentalsService) private readonly service: FundamentalsService,
  ) {}
  @Get('financials')
  @ApiOperation({
    summary: 'Read normalized immutable financial statement revisions',
  })
  @ApiOkResponse({ type: Object })
  async financials(
    @Req() req: Request,
    @Param('symbol') symbol: string,
    @Query() query: FundamentalsQueryDto,
  ) {
    return this.wrap(
      req,
      await this.service.financials(this.key(req), symbol, query),
    );
  }
  @Get('ratios')
  @ApiOperation({ summary: 'Read explainable versioned derived ratios' })
  @ApiOkResponse({ type: Object })
  async ratios(
    @Req() req: Request,
    @Param('symbol') symbol: string,
    @Query() query: FundamentalsQueryDto,
  ) {
    return this.wrap(
      req,
      await this.service.ratioValues(this.key(req), symbol, query),
    );
  }
  @Get('financial-trends')
  @ApiOperation({ summary: 'Read normalized financial metric trends' })
  @ApiOkResponse({ type: Object })
  async trends(
    @Req() req: Request,
    @Param('symbol') symbol: string,
    @Query() query: FundamentalsQueryDto,
  ) {
    return this.wrap(
      req,
      await this.service.trends(this.key(req), symbol, query),
    );
  }
  private wrap(
    req: Request,
    result: { data: unknown; meta: Record<string, unknown> },
  ) {
    return {
      data: result.data,
      meta: { requestId: getRequestId(req), ...result.meta },
    };
  }
  private key(req: Request) {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}
