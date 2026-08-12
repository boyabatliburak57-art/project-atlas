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
  z.object({ kind: z.literal('strategy'), id: z.uuid() }),
  z.object({ kind: z.literal('backtest'), id: z.uuid() }),
  z.object({ kind: z.literal('report'), id: z.uuid() }),
  z.object({ kind: z.literal('support'), id: z.uuid() }),
]);

const tokenTargetSchema = z.object({
  kind: z.enum(['verification', 'reset']),
  token: z
    .string()
    .min(16)
    .max(512)
    .regex(/^[A-Za-z0-9._~-]+$/u),
});
export type TokenDeepLinkTarget = z.infer<typeof tokenTargetSchema>;

export type DeepLinkTarget = z.infer<typeof targetSchema>;

export function parseDeepLink(
  rawUrl: string,
  expectedScheme = 'atlas',
): DeepLinkTarget | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== `${expectedScheme}:`) return null;
    if (
      rawUrl.length > 768 ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    )
      return null;
    const kind = url.hostname;
    const id = url.pathname.replace(/^\/+/u, '');
    return targetSchema.parse({ kind, id });
  } catch {
    return null;
  }
}

export function consumeTokenDeepLink(
  rawUrl: string,
  consume: (target: TokenDeepLinkTarget) => void,
  expectedScheme = 'atlas',
): boolean {
  try {
    if (rawUrl.length > 768) return false;
    const url = new URL(rawUrl);
    if (url.protocol !== `${expectedScheme}:` || url.search || url.hash)
      return false;
    const token = url.pathname.replace(/^\/+|\/+$/gu, '');
    const target = tokenTargetSchema.parse({ kind: url.hostname, token });
    consume(target);
    return true;
  } catch {
    return false;
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
