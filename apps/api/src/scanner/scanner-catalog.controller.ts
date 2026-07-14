import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { getRequestId } from '../common/http/request-context';
import {
  ScanOperatorListResponseDto,
  ScanValidationResponseDto,
  ValidateScanDto,
} from './scanner-catalog.dto';
import { ScannerCatalogService } from './scanner-catalog.service';

@ApiTags('Scanner Catalog')
@Controller('scanner')
export class ScannerCatalogController {
  constructor(private readonly scanner: ScannerCatalogService) {}

  @Get('operators')
  @ApiOperation({ summary: 'List rule-builder operator definitions' })
  @ApiOkResponse({ type: ScanOperatorListResponseDto })
  operators(@Req() request: Request): ScanOperatorListResponseDto {
    return {
      data: [...this.scanner.operators()],
      meta: { requestId: getRequestId(request) },
    };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate and plan a scanner rule' })
  @ApiOkResponse({ type: ScanValidationResponseDto })
  validate(
    @Req() request: Request,
    @Body() body: ValidateScanDto,
  ): ScanValidationResponseDto {
    return {
      data: this.scanner.validate(body),
      meta: { requestId: getRequestId(request) },
    };
  }
}
