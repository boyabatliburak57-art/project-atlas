import { describe, expect, it } from 'vitest';
import {
  clearPrivateQueries,
  createAtlasQueryClient,
  privateQueryKey,
} from './query-client';

describe('query policy', () => {
  it('includes ownership in private keys and clears private cache', async () => {
    const queryClient = createAtlasQueryClient();
    const key = privateQueryKey('scope-hash', ['portfolio']);
    queryClient.setQueryData(key, { private: true });
    queryClient.setQueryData(['public', 'market'], { public: true });
    await clearPrivateQueries(queryClient);
    expect(queryClient.getQueryData(key)).toBeUndefined();
    expect(queryClient.getQueryData(['public', 'market'])).toEqual({
      public: true,
    });
  });

  it('disables mutation retries and offline queueing', () => {
    const defaults = createAtlasQueryClient().getDefaultOptions();
    expect(defaults.mutations?.retry).toBe(false);
    expect(defaults.mutations?.networkMode).toBe('online');
  });
});
