import { shouldRetryRequest } from '@atlas/api-client';
import { QueryClient } from '@tanstack/react-query';

export function createAtlasQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => shouldRetryRequest(failureCount, error),
        networkMode: 'online',
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: false,
        networkMode: 'online',
      },
    },
  });
}

export function privateQueryKey(
  userScope: string,
  parts: readonly unknown[],
): readonly unknown[] {
  return ['private', userScope, ...parts] as const;
}

export async function clearPrivateQueries(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.cancelQueries({ queryKey: ['private'] });
  queryClient.removeQueries({ queryKey: ['private'] });
}
