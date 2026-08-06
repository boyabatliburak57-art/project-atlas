import { describe, expect, it } from 'vitest';
import { assertProviderOrder, providerOrder } from './foundation';

describe('root provider composition', () => {
  it('has a deterministic, dependency-safe, duplicate-free render order', () => {
    expect(assertProviderOrder()).toBe(true);
    expect(providerOrder[0]).toBe('ErrorBoundary');
  });
});
