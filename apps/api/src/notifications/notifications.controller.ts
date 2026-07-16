import type { Request } from 'express';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import {
  AUTHENTICATED_USER_RESOLVER,
  type AuthenticatedUserResolver,
} from '../common/auth/authenticated-user';
import { getRequestId } from '../common/http/request-context';
import {
  NotificationListQueryDto,
  NotificationListResponseDto,
  NotificationPreferencesResponseDto,
  NotificationResponseDto,
  UnreadCountResponseDto,
  UpdateNotificationPreferencesDto,
} from './notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication is required' })
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    @Inject(AUTHENTICATED_USER_RESOLVER)
    private readonly authenticatedUser: AuthenticatedUserResolver,
  ) {}

  @Get()
  @ApiOkResponse({ type: NotificationListResponseDto })
  async list(
    @Req() request: Request,
    @Query() query: NotificationListQueryDto,
  ) {
    const result = await this.service.list(
      this.authenticatedUser(request),
      query,
    );
    return {
      data: result.items,
      meta: { requestId: getRequestId(request), nextCursor: result.nextCursor },
    };
  }

  @Get('unread-count')
  @ApiOkResponse({ type: UnreadCountResponseDto })
  async unreadCount(@Req() request: Request) {
    return this.response(
      request,
      await this.service.unreadCount(this.authenticatedUser(request)),
    );
  }

  @Post('mark-all-read')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Mark all notifications owned by the current user as read',
  })
  async markAllRead(@Req() request: Request) {
    return this.response(
      request,
      await this.service.markAllRead(this.authenticatedUser(request)),
    );
  }

  @Post(':id/read')
  @HttpCode(200)
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiForbiddenResponse({ description: 'Notification belongs to another user' })
  async read(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      await this.service.read(this.authenticatedUser(request), id),
    );
  }

  @Post(':id/unread')
  @HttpCode(200)
  @ApiOkResponse({ type: NotificationResponseDto })
  async unread(@Req() request: Request, @Param('id') id: string) {
    return this.response(
      request,
      await this.service.unread(this.authenticatedUser(request), id),
    );
  }

  private response(request: Request, data: unknown) {
    return { data, meta: { requestId: getRequestId(request) } };
  }
}

@ApiTags('Notification Preferences')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication is required' })
@Controller('notification-preferences')
export class NotificationPreferencesController {
  constructor(
    private readonly service: NotificationsService,
    @Inject(AUTHENTICATED_USER_RESOLVER)
    private readonly authenticatedUser: AuthenticatedUserResolver,
  ) {}

  @Get()
  @ApiOkResponse({ type: NotificationPreferencesResponseDto })
  async get(@Req() request: Request) {
    return this.response(
      request,
      await this.service.getPreferences(this.authenticatedUser(request)),
    );
  }

  @Put()
  @ApiOkResponse({ type: NotificationPreferencesResponseDto })
  async put(
    @Req() request: Request,
    @Body() body: UpdateNotificationPreferencesDto,
  ) {
    return this.response(
      request,
      await this.service.putPreferences(this.authenticatedUser(request), body),
    );
  }

  private response(request: Request, data: unknown) {
    return { data, meta: { requestId: getRequestId(request) } };
  }
}
