import { Inject, Injectable } from '@nestjs/common';
import {
  planScanExecution,
  SCAN_OPERATOR_DEFINITIONS,
  ScanPlanningError,
  validateScanRule,
  type IndicatorRegistry,
} from '@atlas/domain';
import { z } from 'zod';

import { INDICATOR_REGISTRY } from '../indicators/indicator-catalog.service';
import type { ValidateScanDto } from './scanner-catalog.dto';

const requestSchema = z.object({
  rule: z.record(z.string(), z.unknown()),
  universeInstrumentCount: z.number().int().min(1).max(100_000).default(100),
  requestedHistoryBars: z.number().int().min(1).max(10_000).default(1),
});

@Injectable()
export class ScannerCatalogService {
  constructor(
    @Inject(INDICATOR_REGISTRY)
    private readonly indicators: IndicatorRegistry,
  ) {}

  operators() {
    return SCAN_OPERATOR_DEFINITIONS.map((definition) => ({ ...definition }));
  }

  validate(input: ValidateScanDto): Readonly<Record<string, unknown>> {
    const parsed = requestSchema.safeParse(input);
    if (!parsed.success) {
      return {
        valid: false,
        errors: parsed.error.issues.map((issue) => ({
          code: 'INVALID_FIELD',
          path: issue.path.join('.'),
          message: issue.message,
        })),
        warnings: [],
      };
    }
    const validation = validateScanRule(parsed.data.rule);
    if (!validation.valid || validation.normalizedRule === undefined) {
      return { valid: false, errors: validation.errors, warnings: [] };
    }
    try {
      const plan = planScanExecution(
        {
          rule: validation.normalizedRule,
          universeInstrumentCount: parsed.data.universeInstrumentCount,
          requestedHistoryBars: parsed.data.requestedHistoryBars,
        },
        {
          indicatorRegistry: this.indicators,
          entitlement: { check: () => ({ allowed: true }) },
          limits: {
            maximumComplexityScore: Number.MAX_SAFE_INTEGER,
            asynchronousComplexityThreshold: 50_000,
          },
        },
      );
      return {
        valid: true,
        normalizedRule: plan.normalizedRule,
        errors: [],
        warnings: [],
        complexity: plan.complexity,
        executionMode: plan.executionMode,
        timeframes: plan.timeframes,
        uniqueIndicatorCount: plan.complexity.uniqueIndicatorCount,
        warmupRequirement: plan.complexity.warmupBars,
      };
    } catch (error: unknown) {
      if (error instanceof ScanPlanningError) {
        return {
          valid: false,
          errors: [
            {
              code: error.code,
              path: 'rule',
              message: error.code,
              details: error.details,
            },
          ],
          warnings: [],
        };
      }
      throw error;
    }
  }
}
