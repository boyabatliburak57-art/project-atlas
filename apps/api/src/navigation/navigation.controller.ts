import type { Request } from 'express';
import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import {
  AUTHENTICATED_USER_RESOLVER,
  type AuthenticatedUserResolver,
} from '../common/auth/authenticated-user';
import { getRequestId } from '../common/http/request-context';
import { NavigationService } from './navigation.service';

@ApiTags('Search and Activity')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication is required' })
@Controller()
export class NavigationController {
  constructor(
    private readonly service: NavigationService,
    @Inject(AUTHENTICATED_USER_RESOLVER)
    private readonly authenticatedUser: AuthenticatedUserResolver,
  ) {}

  @Get('search')
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'types', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiOkResponse({ description: 'Ownership-safe search page' })
  async search(
    @Req() request: Request,
    @Query() query: Record<string, unknown>,
  ) {
    return {
      data: await this.service.search(this.authenticatedUser(request), query),
      meta: { requestId: getRequestId(request) },
    };
  }

  @Get('activity')
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiOkResponse({ description: 'Current user activity page' })
  async activity(
    @Req() request: Request,
    @Query() query: Record<string, unknown>,
  ) {
    return {
      data: await this.service.activity(this.authenticatedUser(request), query),
      meta: { requestId: getRequestId(request) },
    };
  }
}
