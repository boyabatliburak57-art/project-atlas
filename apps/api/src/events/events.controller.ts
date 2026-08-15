import type { Request } from 'express';
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import {
  AUTHENTICATED_USER_RESOLVER,
  type AuthenticatedUserResolver,
} from '../common/auth/authenticated-user';
import { getRequestId } from '../common/http/request-context';
import { EventFeedQueryDto, EventResponseDto } from './events.dto';
import { EventsService } from './events.service';

@ApiTags('KAP and Corporate Events')
@ApiBearerAuth()
@Controller()
export class EventsController {
  constructor(
    private readonly service: EventsService,
    @Inject(AUTHENTICATED_USER_RESOLVER)
    private readonly authenticatedUser: AuthenticatedUserResolver,
  ) {}

  @Get('events')
  @ApiOperation({ summary: 'Read the canonical KAP/corporate-event feed' })
  @ApiOkResponse({ type: EventResponseDto })
  async feed(@Req() request: Request, @Query() query: EventFeedQueryDto) {
    return this.withRequest(
      request,
      await this.service.feed(
        this.authenticatedUser(request),
        this.clientKey(request),
        query as Record<string, unknown>,
      ),
    );
  }

  @Get('events/:revisionId')
  @ApiOkResponse({ type: EventResponseDto })
  async detail(
    @Req() request: Request,
    @Param('revisionId') revisionId: string,
  ) {
    return this.withRequest(
      request,
      await this.service.detail(this.authenticatedUser(request), revisionId),
    );
  }

  @Get('events/:revisionId/revisions')
  @ApiOkResponse({ type: EventResponseDto })
  async revisions(
    @Req() request: Request,
    @Param('revisionId') revisionId: string,
  ) {
    return this.withRequest(
      request,
      await this.service.revisions(this.authenticatedUser(request), revisionId),
    );
  }

  @Get('companies/:companyId/disclosures')
  @ApiOkResponse({ type: EventResponseDto })
  async company(
    @Req() request: Request,
    @Param('companyId') companyId: string,
    @Query() query: EventFeedQueryDto,
  ) {
    return this.withRequest(
      request,
      await this.service.feed(
        this.authenticatedUser(request),
        this.clientKey(request),
        query as Record<string, unknown>,
        { companyId },
      ),
    );
  }

  @Get('symbols/:symbol/events')
  @ApiOkResponse({ type: EventResponseDto })
  async symbol(
    @Req() request: Request,
    @Param('symbol') symbol: string,
    @Query() query: EventFeedQueryDto,
  ) {
    return this.withRequest(
      request,
      await this.service.feed(
        this.authenticatedUser(request),
        this.clientKey(request),
        query as Record<string, unknown>,
        { symbol },
      ),
    );
  }

  private withRequest(
    request: Request,
    result: { data: unknown; meta: Record<string, unknown> },
  ) {
    return {
      data: result.data,
      meta: { requestId: getRequestId(request), ...result.meta },
    };
  }
  private clientKey(request: Request) {
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}
