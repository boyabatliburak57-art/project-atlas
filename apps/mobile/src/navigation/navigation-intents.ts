import { z } from 'zod';

const uuid = z.uuid();
const symbol = z.string().regex(/^[A-Z0-9.]{1,24}$/u);

export const navigationIntentSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('OpenSymbol'), symbol }),
  z.object({ kind: z.literal('OpenScanner'), runId: uuid.optional() }),
  z.object({ kind: z.literal('OpenWatchlist'), id: uuid.optional() }),
  z.object({ kind: z.literal('OpenAlert'), id: uuid.optional() }),
  z.object({ kind: z.literal('OpenPortfolio'), id: uuid.optional() }),
  z.object({ kind: z.literal('OpenStrategy'), id: uuid.optional() }),
  z.object({ kind: z.literal('OpenBacktest'), id: uuid.optional() }),
  z.object({ kind: z.literal('OpenReport'), id: uuid.optional() }),
  z.object({ kind: z.literal('OpenInstitution'), id: uuid }),
  z.object({
    kind: z.literal('OpenInstitutionalInstrument'),
    symbol,
    period: z.enum(['1D', '5D', '20D']).optional(),
  }),
  z.object({
    kind: z.literal('OpenSettlementInstrument'),
    symbol,
    settlementDate: z.iso.date().optional(),
  }),
  z.object({ kind: z.literal('OpenEvent'), id: uuid }),
  z.object({ kind: z.literal('OpenFund'), id: uuid }),
  z.object({
    kind: z.literal('OpenVIOPContract'),
    id: z.string().regex(/^[A-Z0-9._-]{1,32}$/u),
  }),
  z.object({
    kind: z.literal('OpenCompare'),
    ids: z.array(symbol).min(2).max(8),
  }),
]);

export type NavigationIntent = z.infer<typeof navigationIntentSchema>;

export interface NavigationIntentContract {
  readonly route: string;
  readonly requiresAuth: true;
  readonly ownershipRequirement: 'NONE' | 'SERVER_REVALIDATION';
  readonly capability?: string;
  readonly fallback: '/+not-found' | '/markets' | '/research';
}

export function resolveNavigationIntent(
  value: unknown,
): NavigationIntentContract | null {
  const parsed = navigationIntentSchema.safeParse(value);
  if (!parsed.success) return null;
  const intent = parsed.data;
  switch (intent.kind) {
    case 'OpenSymbol':
      return {
        route: `/symbol/${intent.symbol}`,
        requiresAuth: true,
        ownershipRequirement: 'NONE',
        capability: 'mobileMarkets',
        fallback: '/markets',
      };
    case 'OpenScanner':
      return {
        route: intent.runId
          ? `/radar/scanner?runId=${intent.runId}`
          : '/radar/scanner',
        requiresAuth: true,
        ownershipRequirement: intent.runId ? 'SERVER_REVALIDATION' : 'NONE',
        capability: 'mobileScanner',
        fallback: '/+not-found',
      };
    case 'OpenWatchlist':
      return {
        route: intent.id
          ? `/radar/watchlists?resourceId=${intent.id}`
          : '/radar/watchlists',
        requiresAuth: true,
        ownershipRequirement: intent.id ? 'SERVER_REVALIDATION' : 'NONE',
        capability: 'mobileAlerts',
        fallback: '/+not-found',
      };
    case 'OpenAlert':
      return {
        route: intent.id
          ? `/radar/alerts?resourceId=${intent.id}`
          : '/radar/alerts',
        requiresAuth: true,
        ownershipRequirement: intent.id ? 'SERVER_REVALIDATION' : 'NONE',
        capability: 'mobileAlerts',
        fallback: '/+not-found',
      };
    case 'OpenPortfolio':
      return {
        route: intent.id
          ? `/portfolio/overview?resourceId=${intent.id}`
          : '/portfolio/overview',
        requiresAuth: true,
        ownershipRequirement: intent.id ? 'SERVER_REVALIDATION' : 'NONE',
        capability: 'mobilePortfolio',
        fallback: '/+not-found',
      };
    case 'OpenStrategy':
      return {
        route: intent.id
          ? `/research/strategies?resourceId=${intent.id}`
          : '/research/strategies',
        requiresAuth: true,
        ownershipRequirement: intent.id ? 'SERVER_REVALIDATION' : 'NONE',
        capability: 'mobileStrategyLab',
        fallback: '/+not-found',
      };
    case 'OpenBacktest':
      return {
        route: intent.id
          ? `/research/backtests?resourceId=${intent.id}`
          : '/research/backtests',
        requiresAuth: true,
        ownershipRequirement: intent.id ? 'SERVER_REVALIDATION' : 'NONE',
        capability: 'mobileStrategyLab',
        fallback: '/+not-found',
      };
    case 'OpenReport':
      return {
        route: intent.id
          ? `/research/reports?resourceId=${intent.id}`
          : '/research/reports',
        requiresAuth: true,
        ownershipRequirement: intent.id ? 'SERVER_REVALIDATION' : 'NONE',
        capability: 'mobileReports',
        fallback: '/+not-found',
      };
    case 'OpenInstitution':
      return {
        route: `/markets/institutional/institutions/${intent.id}`,
        requiresAuth: true,
        ownershipRequirement: 'NONE',
        capability: 'institutional.akd',
        fallback: '/markets',
      };
    case 'OpenInstitutionalInstrument':
      return {
        route: `/markets/institutional/akd?symbol=${intent.symbol}${intent.period ? `&period=${intent.period}` : ''}`,
        requiresAuth: true,
        ownershipRequirement: 'NONE',
        capability: 'institutional.akd',
        fallback: '/markets',
      };
    case 'OpenSettlementInstrument':
      return {
        route: `/markets/institutional/takas?symbol=${intent.symbol}${intent.settlementDate ? `&settlementDate=${intent.settlementDate}` : ''}`,
        requiresAuth: true,
        ownershipRequirement: 'NONE',
        capability: 'settlement.snapshot',
        fallback: '/markets',
      };
    case 'OpenEvent':
      return {
        route: `/research/events/${intent.id}`,
        requiresAuth: true,
        ownershipRequirement: 'SERVER_REVALIDATION',
        capability: 'events',
        fallback: '/research',
      };
    case 'OpenFund':
      return {
        route: `/markets/funds?id=${intent.id}`,
        requiresAuth: true,
        ownershipRequirement: 'SERVER_REVALIDATION',
        capability: 'funds',
        fallback: '/markets',
      };
    case 'OpenVIOPContract':
      return {
        route: `/markets/derivatives?contract=${intent.id}`,
        requiresAuth: true,
        ownershipRequirement: 'NONE',
        capability: 'viop',
        fallback: '/markets',
      };
    case 'OpenCompare':
      return {
        route: `/research/compare?symbols=${intent.ids.join(',')}`,
        requiresAuth: true,
        ownershipRequirement: 'NONE',
        capability: 'comparison',
        fallback: '/research',
      };
  }
}

export const allowedNavigationAnalytics = [
  'primary_tab_opened',
  'hub_section_opened',
  'global_search_opened',
  'smart_inbox_opened',
  'profile_menu_opened',
  'contextual_navigation_used',
] as const;

export function safeNavigationAnalyticsProperties(input: {
  readonly hub?: string;
  readonly section?: string;
  readonly intentKind?: NavigationIntent['kind'];
}): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(input).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}
