import { Controller, Delete, Get, Inject, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';

import {
  AUTHENTICATED_USER_RESOLVER,
  type AuthenticatedUserResolver,
} from '../common/auth/authenticated-user';
import { getRequestId } from '../common/http/request-context';
import { DemoService } from './demo.service';

@ApiTags('Demo and Product Education')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication is required' })
@Controller('me/demo')
export class DemoController {
  constructor(
    private readonly demo: DemoService,
    @Inject(AUTHENTICATED_USER_RESOLVER)
    private readonly authenticatedUser: AuthenticatedUserResolver,
  ) {}

  @Get()
  async list(@Req() request: Request) {
    return response(
      request,
      await this.demo.list(this.authenticatedUser(request)),
    );
  }

  @Post()
  async create(@Req() request: Request) {
    return response(
      request,
      await this.demo.create(
        this.authenticatedUser(request),
        getRequestId(request),
      ),
    );
  }

  @Delete()
  async reset(@Req() request: Request) {
    return response(
      request,
      await this.demo.reset(
        this.authenticatedUser(request),
        getRequestId(request),
      ),
    );
  }
}

function response(request: Request, data: unknown) {
  return { data, meta: { requestId: getRequestId(request) } };
}
