import type { Request } from 'express';
import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import {
  AUTHENTICATED_USER_RESOLVER,
  type AuthenticatedUserResolver,
} from '../common/auth/authenticated-user';
import { getRequestId } from '../common/http/request-context';
import {
  OnboardingCommandDto,
  PreferencesResponseDto,
  UpdatePreferencesDto,
} from './preferences.dto';
import { PreferencesService } from './preferences.service';

@ApiTags('Preferences and Onboarding')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication is required' })
@Controller('me')
export class PreferencesController {
  constructor(
    private readonly service: PreferencesService,
    @Inject(AUTHENTICATED_USER_RESOLVER)
    private readonly authenticatedUser: AuthenticatedUserResolver,
  ) {}

  @Get('preferences')
  @ApiOkResponse({ type: PreferencesResponseDto })
  get(@Req() request: Request) {
    return this.response(
      request,
      this.service.get(this.authenticatedUser(request)),
    );
  }

  @Patch('preferences')
  @ApiOkResponse({ type: PreferencesResponseDto })
  @ApiConflictResponse({ description: 'Optimistic version conflict' })
  patch(@Req() request: Request, @Body() body: UpdatePreferencesDto) {
    return this.response(
      request,
      this.service.update(this.authenticatedUser(request), body),
    );
  }

  @Get('onboarding')
  getOnboarding(@Req() request: Request) {
    return this.response(
      request,
      this.service.onboarding(this.authenticatedUser(request)),
    );
  }

  @Post('onboarding/complete')
  complete(@Req() request: Request, @Body() body: OnboardingCommandDto) {
    return this.response(
      request,
      this.service.complete(this.authenticatedUser(request), body),
    );
  }

  @Post('onboarding/reset')
  reset(@Req() request: Request, @Body() body: OnboardingCommandDto) {
    return this.response(
      request,
      this.service.reset(this.authenticatedUser(request), body),
    );
  }

  private async response(request: Request, promise: Promise<unknown>) {
    return { data: await promise, meta: { requestId: getRequestId(request) } };
  }
}
