import { publicEnvironment } from '@/config/env';

import type {
  BacktestRun,
  BacktestSummary,
  Experiment,
  SeriesPoint,
  Strategy,
  StrategyDefinition,
  StrategyValidation,
  Trade,
} from './types';

const base = publicEnvironment.NEXT_PUBLIC_API_URL;

interface Envelope<T> {
  readonly data: T;
  readonly meta?: {
    readonly nextCursor?: string | null;
    readonly replayed?: boolean;
  };
}

export class StrategyLabApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
    this.name = 'StrategyLabApiError';
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<Envelope<T>> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = (await response.json().catch(() => null)) as
    | Envelope<T>
    | { error?: { code?: string } }
    | null;
  if (!response.ok) {
    const error = body as { error?: { code?: string } } | null;
    throw new StrategyLabApiError(
      error?.error?.code ?? `HTTP_${response.status}`,
      response.status,
    );
  }
  return body as Envelope<T>;
}

export const strategyLabApi = {
  strategies: async (includeDeleted = false) =>
    (
      await request<{ items: Strategy[] }>(
        `/strategies?includeDeleted=${includeDeleted}`,
      )
    ).data.items,
  strategy: async (id: string) =>
    (await request<Strategy>(`/strategies/${id}`)).data,
  revisions: async (id: string) =>
    (
      await request<{ items: Strategy['revision'][] }>(
        `/strategies/${id}/revisions`,
      )
    ).data.items,
  validate: async (definition: StrategyDefinition) =>
    (
      await request<StrategyValidation>('/strategies/validate', {
        method: 'POST',
        body: JSON.stringify({ definition }),
      })
    ).data,
  createStrategy: async (input: {
    name: string;
    description: string;
    definition: StrategyDefinition;
    status: 'draft' | 'validated';
  }) =>
    (
      await request<Strategy>('/strategies', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    ).data,
  reviseStrategy: async (
    id: string,
    input: {
      expectedRevision: number;
      name: string;
      description: string;
      definition: StrategyDefinition;
      status: 'draft' | 'validated';
    },
  ) =>
    (
      await request<Strategy>(`/strategies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      })
    ).data,
  archiveStrategy: async (id: string) =>
    (await request<Strategy>(`/strategies/${id}`, { method: 'DELETE' })).data,
  cloneStrategy: async (id: string) =>
    (
      await request<Strategy>(`/strategies/${id}/clone`, {
        method: 'POST',
        body: '{}',
      })
    ).data,
  backtests: async () =>
    (await request<{ items: BacktestRun[] }>('/backtests?limit=50')).data.items,
  backtest: async (id: string) =>
    (await request<BacktestRun>(`/backtests/${id}`)).data,
  createBacktest: async (input: Record<string, unknown>, key: string) =>
    (
      await request<BacktestRun>('/backtests', {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        body: JSON.stringify(input),
      })
    ).data,
  cancelBacktest: async (id: string) =>
    (
      await request<BacktestRun>(`/backtests/${id}/cancel`, {
        method: 'POST',
        body: '{}',
      })
    ).data,
  summary: async (id: string) =>
    (await request<BacktestSummary>(`/backtests/${id}/summary`)).data,
  series: async (id: string, type: string) =>
    (
      await request<{ items: SeriesPoint[] }>(
        `/backtests/${id}/series?type=${type}&limit=2000&resolution=daily`,
      )
    ).data.items,
  trades: async (id: string, cursor?: string) => {
    const envelope = await request<{ items: Trade[] }>(
      `/backtests/${id}/trades?limit=25${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    );
    return {
      items: envelope.data.items,
      nextCursor: envelope.meta?.nextCursor ?? null,
    };
  },
  orders: async (id: string) =>
    (
      await request<{ items: Record<string, unknown>[] }>(
        `/backtests/${id}/orders?limit=100`,
      )
    ).data.items,
  fills: async (id: string) =>
    (
      await request<{ items: Record<string, unknown>[] }>(
        `/backtests/${id}/fills?limit=100`,
      )
    ).data.items,
  methodology: async (id: string) =>
    (await request<Record<string, unknown>>(`/backtests/${id}/methodology`))
      .data,
  experiments: async () =>
    (await request<{ items: Experiment[] }>('/experiments')).data.items,
  experiment: async (id: string) =>
    (await request<Experiment>(`/experiments/${id}`)).data,
  createExperiment: async (input: Record<string, unknown>) =>
    (
      await request<Experiment>('/experiments', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    ).data,
  cancelExperiment: async (id: string) =>
    (
      await request<Experiment>(`/experiments/${id}/cancel`, {
        method: 'POST',
        body: '{}',
      })
    ).data,
  experimentResults: async (id: string) =>
    (
      await request<{ items: Record<string, unknown>[] }>(
        `/experiments/${id}/results`,
      )
    ).data.items,
  experimentMatrix: async (id: string) =>
    (
      await request<{ items: Record<string, unknown>[] }>(
        `/experiments/${id}/matrix`,
      )
    ).data.items,
  exportExperiment: async (id: string) => {
    const response = await fetch(`${base}/experiments/${id}/export`, {
      method: 'POST',
    });
    if (!response.ok)
      throw new StrategyLabApiError(`HTTP_${response.status}`, response.status);
    return response.blob();
  },
};

export function safeLabError(error: unknown) {
  const code =
    error instanceof StrategyLabApiError ? error.code : 'STRATEGY_LAB_FAILED';
  const message: Record<string, string> = {
    STRATEGY_ACCESS_DENIED: 'Bu stratejiye erişim izniniz yok.',
    BACKTEST_RUN_ACCESS_DENIED: 'Bu backtest sonucuna erişim izniniz yok.',
    EXPERIMENT_ACCESS_DENIED: 'Bu deneye erişim izniniz yok.',
    STRATEGY_REVISION_CONFLICT:
      'Strateji başka bir oturumda güncellendi. Sayfayı yenileyin.',
    BACKTEST_RATE_LIMITED:
      'Çalıştırma sınırına ulaşıldı. Biraz sonra tekrar deneyin.',
  };
  return (
    message[code] ??
    'İşlem tamamlanamadı. Girdileri kontrol edip tekrar deneyin.'
  );
}
