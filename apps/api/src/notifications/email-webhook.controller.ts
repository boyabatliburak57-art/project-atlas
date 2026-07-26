import type { Request } from 'express';
import { Body, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { getRequestId } from '../common/http/request-context';
import { EmailWebhookService } from './email-webhook.service';

@ApiTags('Communication Provider Webhooks')
@Controller('webhooks/email')
export class EmailWebhookController {
  constructor(private readonly webhooks: EmailWebhookService) {}

  @Post()
  @HttpCode(202)
  @ApiOperation({ summary: 'Accept signed bounce and complaint events' })
  async process(
    @Req() request: Request,
    @Body() body: unknown,
    @Headers('x-atlas-email-signature') signature: string | undefined,
    @Headers('x-atlas-email-timestamp') timestamp: string | undefined,
  ) {
    return {
      data: await this.webhooks.process({ body, signature, timestamp }),
      meta: { requestId: getRequestId(request) },
    };
  }
}
