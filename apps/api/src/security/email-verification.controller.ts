import type { Request } from 'express';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { getRequestId } from '../common/http/request-context';
import { EmailVerificationService } from './email-verification.service';

@ApiTags('Authentication')
@Controller('auth/email-verification')
export class EmailVerificationController {
  constructor(private readonly verification: EmailVerificationService) {}

  @Get('status')
  @ApiOperation({ summary: 'Read authoritative e-mail verification status' })
  async status(@Req() request: Request) {
    return {
      data: await this.verification.status(requiredUser(request)),
      meta: { requestId: getRequestId(request) },
    };
  }

  @Post('resend')
  @HttpCode(202)
  @ApiOperation({ summary: 'Queue an enumeration-safe verification delivery' })
  async resend(@Req() request: Request) {
    return {
      data: await this.verification.resend(requiredUser(request)),
      meta: { requestId: getRequestId(request) },
    };
  }

  @Post('confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Consume a single-use verification token' })
  async confirm(@Req() request: Request, @Body() body: unknown) {
    return {
      data: await this.verification.confirm(body, request.authenticatedUserId),
      meta: { requestId: getRequestId(request) },
    };
  }
}

function requiredUser(request: Request): string {
  if (request.authenticatedUserId === undefined)
    throw new UnauthorizedException({
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication is required',
    });
  return request.authenticatedUserId;
}
