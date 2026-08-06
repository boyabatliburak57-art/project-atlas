import { z } from 'zod';

const targetSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('symbol'),
    id: z.string().regex(/^[A-Z0-9.]{1,24}$/u),
  }),
  z.object({ kind: z.literal('alert'), id: z.uuid() }),
  z.object({ kind: z.literal('scan-result'), id: z.uuid() }),
  z.object({ kind: z.literal('watchlist'), id: z.uuid() }),
  z.object({ kind: z.literal('portfolio'), id: z.uuid() }),
  z.object({ kind: z.literal('backtest'), id: z.uuid() }),
  z.object({ kind: z.literal('report'), id: z.uuid() }),
]);

export type DeepLinkTarget = z.infer<typeof targetSchema>;

export function parseDeepLink(
  rawUrl: string,
  expectedScheme = 'atlas',
): DeepLinkTarget | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== `${expectedScheme}:`) return null;
    const kind = url.hostname;
    const id = url.pathname.replace(/^\/+/u, '');
    return targetSchema.parse({ kind, id });
  } catch {
    return null;
  }
}

export function gateDeepLink(
  target: DeepLinkTarget,
  input: {
    readonly authenticated: boolean;
    readonly onboardingComplete: boolean;
  },
): {
  readonly destination: 'auth' | 'onboarding' | 'resource';
  readonly pending?: DeepLinkTarget;
} {
  if (!input.authenticated) return { destination: 'auth', pending: target };
  if (!input.onboardingComplete)
    return { destination: 'onboarding', pending: target };
  return { destination: 'resource' };
}
