import type { Request } from 'express';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import {
  AUTHENTICATED_USER_RESOLVER,
  type AuthenticatedUserResolver,
} from '../common/auth/authenticated-user';
import { getRequestId } from '../common/http/request-context';
import { PushDevicesService } from './push-devices.service';

@ApiTags('Push Devices')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication is required' })
@Controller('push-devices')
export class PushDevicesController {
  constructor(
    private readonly service: PushDevicesService,
    @Inject(AUTHENTICATED_USER_RESOLVER)
    private readonly authenticatedUser: AuthenticatedUserResolver,
  ) {}

  @Post('register')
  @ApiOperation({
    summary:
      'Register or idempotently refresh an owner-scoped iOS installation',
  })
  async register(@Req() request: Request, @Body() body: unknown) {
    return this.response(
      request,
      await this.service.register(this.authenticatedUser(request), body),
    );
  }

  @Post('rotate')
  @ApiOperation({
    summary: 'Rotate the delivery token for an existing installation',
  })
  async rotate(@Req() request: Request, @Body() body: unknown) {
    return this.response(
      request,
      await this.service.rotate(this.authenticatedUser(request), body),
    );
  }

  @Delete(':installationId')
  @HttpCode(200)
  async revoke(
    @Req() request: Request,
    @Param('installationId') installationId: string,
  ) {
    return this.response(
      request,
      await this.service.revoke(
        this.authenticatedUser(request),
        installationId,
      ),
    );
  }

  @Post('revoke-all')
  @HttpCode(200)
  async revokeAll(@Req() request: Request) {
    return this.response(
      request,
      await this.service.revokeAll(this.authenticatedUser(request)),
    );
  }

  private response(request: Request, data: unknown) {
    return { data, meta: { requestId: getRequestId(request) } };
  }
}
