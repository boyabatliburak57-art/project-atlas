import type { Request, Response } from 'express';
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import {
  AUTHENTICATED_USER_RESOLVER,
  type AuthenticatedUserResolver,
} from '../common/auth/authenticated-user';
import { getRequestId } from '../common/http/request-context';
import {
  CreatePortfolioDto,
  CreatePortfolioTransactionDto,
  PerformanceQueryDto,
  PortfolioAnalyticsResponseDto,
  PortfolioListQueryDto,
  PortfolioListResponseDto,
  PortfolioResponseDto,
  TransactionListQueryDto,
  TransactionListResponseDto,
  TransactionResponseDto,
  UpdatePortfolioDto,
  ValuationHistoryQueryDto,
} from './portfolios.dto';
import {
  analyticsDto,
  portfolioDto,
  PortfoliosService,
  transactionDto,
} from './portfolios.service';

@ApiTags('Portfolios')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication is required' })
@Controller('portfolios')
export class PortfoliosController {
  constructor(
    private readonly service: PortfoliosService,
    @Inject(AUTHENTICATED_USER_RESOLVER)
    private readonly authenticatedUser: AuthenticatedUserResolver,
  ) {}

  @Get()
  @ApiOkResponse({ type: PortfolioListResponseDto })
  async list(@Req() request: Request, @Query() query: PortfolioListQueryDto) {
    const result = await this.service.list(this.user(request), query);
    return {
      data: { items: result.items.map(portfolioDto) },
      meta: { requestId: getRequestId(request), nextCursor: result.nextCursor },
    };
  }

  @Post()
  @ApiCreatedResponse({ type: PortfolioResponseDto })
  async create(@Req() request: Request, @Body() body: CreatePortfolioDto) {
    return this.response(
      request,
      portfolioDto(await this.service.create(this.user(request), body)),
    );
  }

  @Get(':id')
  @ApiOkResponse({ type: PortfolioResponseDto })
  @ApiForbiddenResponse({ description: 'Portfolio belongs to another user' })
  @ApiNotFoundResponse({ description: 'Portfolio was not found' })
  async get(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      portfolioDto(await this.service.get(this.user(request), id)),
    );
  }

  @Patch(':id')
  @ApiOkResponse({ type: PortfolioResponseDto })
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: UpdatePortfolioDto,
  ) {
    return this.response(
      request,
      portfolioDto(await this.service.update(this.user(request), id, body)),
    );
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Soft-delete an owned portfolio' })
  @ApiOkResponse({ type: PortfolioResponseDto })
  async delete(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      portfolioDto(await this.service.delete(this.user(request), id)),
    );
  }

  @Post(':id/restore')
  @HttpCode(200)
  @ApiOkResponse({ type: PortfolioResponseDto })
  async restore(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      portfolioDto(await this.service.restore(this.user(request), id)),
    );
  }

  @Get(':id/transactions')
  @ApiOkResponse({ type: TransactionListResponseDto })
  async transactions(
    @Req() request: Request,
    @Param('id') id: string,
    @Query() query: TransactionListQueryDto,
  ) {
    const result = await this.service.listTransactions(
      this.user(request),
      id,
      query,
    );
    return {
      data: { items: result.items.map(transactionDto) },
      meta: { requestId: getRequestId(request), nextCursor: result.nextCursor },
    };
  }

  @Post(':id/transactions')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ type: TransactionResponseDto })
  @ApiOkResponse({
    description: 'Idempotent replay',
    type: TransactionResponseDto,
  })
  @ApiConflictResponse({ description: 'Idempotency conflict' })
  async createTransaction(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: CreatePortfolioTransactionDto,
  ) {
    const result = await this.service.createTransaction(
      this.user(request),
      id,
      key,
      body,
    );
    response.status(result.replayed ? 200 : 201);
    return {
      data: transactionDto(result.transaction),
      meta: { requestId: getRequestId(request), replayed: result.replayed },
    };
  }

  @Get(':id/transactions/:transactionId')
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiForbiddenResponse({ description: 'Portfolio or transaction IDOR denied' })
  async transaction(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.response(
      request,
      transactionDto(
        await this.service.transaction(this.user(request), id, transactionId),
      ),
    );
  }

  @Post(':id/transactions/:transactionId/post')
  @HttpCode(200)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Ledger constraint failed' })
  async postTransaction(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('transactionId') transactionId: string,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    const result = await this.service.post(
      this.user(request),
      id,
      transactionId,
      key,
    );
    return {
      data: transactionDto(result.value.transaction),
      meta: {
        requestId: getRequestId(request),
        replayed: result.replayed,
        ledgerVersion: result.value.portfolio.ledgerVersion,
      },
    };
  }

  @Post(':id/transactions/:transactionId/reverse')
  @HttpCode(200)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOkResponse({ type: TransactionResponseDto })
  async reverseTransaction(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('transactionId') transactionId: string,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    const result = await this.service.reverse(
      this.user(request),
      id,
      transactionId,
      key,
    );
    return {
      data: transactionDto(result.value.transaction),
      meta: {
        requestId: getRequestId(request),
        replayed: result.replayed,
        ledgerVersion: result.value.portfolio.ledgerVersion,
      },
    };
  }

  @Get(':id/positions')
  @ApiOkResponse({ type: PortfolioAnalyticsResponseDto })
  async positions(@Req() request: Request, @Param('id') id: string) {
    return this.response(request, {
      items: await this.service.positions(this.user(request), id),
    });
  }

  @Get(':id/valuation')
  @ApiOkResponse({ type: PortfolioAnalyticsResponseDto })
  async valuation(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      analyticsDto(await this.service.valuation(this.user(request), id)),
    );
  }

  @Get(':id/valuation-history')
  @ApiOkResponse({ type: PortfolioAnalyticsResponseDto })
  async valuationHistory(
    @Req() request: Request,
    @Param('id') id: string,
    @Query() query: ValuationHistoryQueryDto,
  ) {
    const result = await this.service.valuationHistory(
      this.user(request),
      id,
      query,
    );
    return {
      data: { items: result.items.map((item) => analyticsDto(item)) },
      meta: { requestId: getRequestId(request), nextCursor: result.nextCursor },
    };
  }

  @Post(':id/recalculate')
  @HttpCode(200)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOkResponse({ type: PortfolioAnalyticsResponseDto })
  @ApiTooManyRequestsResponse({
    description: 'Recalculation rate limit exceeded',
  })
  async recalculate(
    @Req() request: Request,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    const result = await this.service.recalculate(this.user(request), id, key);
    return {
      data: result.value,
      meta: { requestId: getRequestId(request), replayed: result.replayed },
    };
  }

  @Get(':id/performance')
  @ApiOkResponse({ type: PortfolioAnalyticsResponseDto })
  async performance(
    @Req() request: Request,
    @Param('id') id: string,
    @Query() query: PerformanceQueryDto,
  ) {
    return this.response(
      request,
      analyticsDto(
        await this.service.performance(this.user(request), id, query),
      ),
    );
  }

  @Get(':id/risk')
  @ApiOkResponse({ type: PortfolioAnalyticsResponseDto })
  async risk(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      analyticsDto(await this.service.risk(this.user(request), id)),
    );
  }

  private user(request: Request): string {
    return this.authenticatedUser(request);
  }

  private response(request: Request, data: unknown) {
    return { data, meta: { requestId: getRequestId(request) } };
  }
}
