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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import {
  AUTHENTICATED_USER_RESOLVER,
  type AuthenticatedUserResolver,
} from '../common/auth/authenticated-user';
import { getRequestId } from '../common/http/request-context';
import {
  AddWatchlistItemDto,
  CreateWatchlistDto,
  ReorderWatchlistItemsDto,
  UpdateWatchlistDto,
  UpdateWatchlistItemDto,
  WatchlistListResponseDto,
  WatchlistMarketSummaryQueryDto,
  WatchlistMarketSummaryResponseDto,
  WatchlistResponseDto,
  WatchlistsQueryDto,
} from './watchlists.dto';
import { WatchlistsService } from './watchlists.service';

@ApiTags('Watchlists')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication is required' })
@Controller('watchlists')
export class WatchlistsController {
  constructor(
    private readonly service: WatchlistsService,
    @Inject(AUTHENTICATED_USER_RESOLVER)
    private readonly authenticatedUser: AuthenticatedUserResolver,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List owned private watchlists' })
  @ApiOkResponse({ type: WatchlistListResponseDto })
  async list(@Req() request: Request, @Query() query: WatchlistsQueryDto) {
    const result = await this.service.list(
      this.authenticatedUser(request),
      query,
    );
    return {
      data: { items: result.items },
      meta: {
        requestId: getRequestId(request),
        nextCursor: result.nextCursor,
      },
    };
  }

  @Post()
  @ApiCreatedResponse({ type: WatchlistResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Watchlist quota exceeded' })
  async create(@Req() request: Request, @Body() body: CreateWatchlistDto) {
    return this.response(
      request,
      await this.service.create(this.authenticatedUser(request), body),
    );
  }

  @Get(':id')
  @ApiOkResponse({ type: WatchlistResponseDto })
  @ApiForbiddenResponse({ description: 'Watchlist belongs to another user' })
  @ApiNotFoundResponse({ description: 'Watchlist was not found' })
  async get(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      await this.service.get(this.authenticatedUser(request), id),
    );
  }

  @Patch(':id')
  @ApiOkResponse({ type: WatchlistResponseDto })
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: UpdateWatchlistDto,
  ) {
    return this.response(
      request,
      await this.service.update(this.authenticatedUser(request), id, body),
    );
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Soft-delete an owned watchlist' })
  @ApiOkResponse({ type: WatchlistResponseDto })
  async delete(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      await this.service.delete(this.authenticatedUser(request), id),
    );
  }

  @Post(':id/restore')
  @HttpCode(200)
  @ApiOperation({ summary: 'Restore a soft-deleted watchlist' })
  @ApiOkResponse({ type: WatchlistResponseDto })
  async restore(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      await this.service.restore(this.authenticatedUser(request), id),
    );
  }

  @Post(':id/items')
  @ApiCreatedResponse({ type: WatchlistResponseDto })
  @ApiConflictResponse({ description: 'Instrument already exists' })
  async addItem(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: AddWatchlistItemDto,
  ) {
    return this.response(
      request,
      await this.service.addItem(this.authenticatedUser(request), id, body),
    );
  }

  @Patch(':id/items/:itemId')
  @ApiOkResponse({ type: WatchlistResponseDto })
  async updateItem(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: UpdateWatchlistItemDto,
  ) {
    return this.response(
      request,
      await this.service.updateItem(
        this.authenticatedUser(request),
        id,
        itemId,
        body,
      ),
    );
  }

  @Delete(':id/items/:itemId')
  @HttpCode(200)
  @ApiOkResponse({ type: WatchlistResponseDto })
  async removeItem(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.response(
      request,
      await this.service.removeItem(
        this.authenticatedUser(request),
        id,
        itemId,
      ),
    );
  }

  @Post(':id/reorder')
  @HttpCode(200)
  @ApiOperation({ summary: 'Replace the complete deterministic item order' })
  @ApiOkResponse({ type: WatchlistResponseDto })
  async reorder(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: ReorderWatchlistItemsDto,
  ) {
    return this.response(
      request,
      await this.service.reorder(this.authenticatedUser(request), id, body),
    );
  }

  @Get(':id/market-summary')
  @ApiOperation({ summary: 'Get paginated watchlist market summary' })
  @ApiOkResponse({ type: WatchlistMarketSummaryResponseDto })
  async marketSummary(
    @Req() request: Request,
    @Param('id') id: string,
    @Query() query: WatchlistMarketSummaryQueryDto,
  ) {
    const result = await this.service.marketSummary(
      this.authenticatedUser(request),
      id,
      query,
    );
    return {
      data: { watchlistId: id, items: result.items },
      meta: {
        requestId: getRequestId(request),
        nextCursor: result.nextCursor,
        dataCutoffAt: result.dataCutoffAt,
        staleAfterMs: result.staleAfterMs,
      },
    };
  }

  private response(request: Request, data: unknown) {
    return { data, meta: { requestId: getRequestId(request) } };
  }
}
