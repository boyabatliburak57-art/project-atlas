import { createHash } from 'node:crypto';

import { createStableParameterHash } from '../../indicators/parameter-hash.js';
import type { ScanRuleAst } from '../ast/contracts.js';

import type { ScanRunSource } from './contracts.js';

export function hashIdempotencyKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex');
}

export function hashNormalizedScanRunRequest(input: {
  readonly source: ScanRunSource;
  readonly normalizedRule: ScanRuleAst;
  readonly requestedHistoryBars: number;
}): string {
  return createStableParameterHash({
    normalizedRule: input.normalizedRule,
    requestedHistoryBars: input.requestedHistoryBars,
    source: {
      type: input.source.type,
      ...(input.source.id === undefined ? {} : { id: input.source.id }),
      ...(input.source.revision === undefined
        ? {}
        : { revision: input.source.revision }),
    },
  });
}
