const publicAuthRoutes = new Set([
  'account-locked',
  'forgot-password',
  'register',
  'session-expired',
]);

const staticAliases = new Map<string, string>([
  ['home', '/(tabs)/home'],
  ['markets', '/(tabs)/markets'],
  ['search', '/search'],
  ['scanner', '/radar/scanner'],
  ['watchlists', '/radar/watchlists'],
  ['alerts', '/radar/alerts'],
  ['notifications', '/inbox'],
  ['portfolio', '/portfolio/overview'],
  ['strategies', '/research/strategies'],
  ['backtests', '/research/backtests'],
  ['reports', '/research/reports'],
  ['settings', '/settings'],
  ['help', '/help'],
  ['support', '/support'],
]);

const canonicalStaticPaths = new Set([
  '/(tabs)/home',
  '/(tabs)/markets',
  '/(tabs)/radar',
  '/(tabs)/portfolio',
  '/(tabs)/research',
  '/markets/overview',
  '/markets/indices',
  '/markets/sectors',
  '/radar/scanner',
  '/radar/saved',
  '/radar/watchlists',
  '/radar/alerts',
  '/radar/activity',
  '/portfolio/overview',
  '/portfolio/positions',
  '/portfolio/transactions',
  '/portfolio/performance',
  '/portfolio/risk',
  '/portfolio/quality',
  '/research/strategies',
  '/research/backtests',
  '/research/reports',
  '/research/methodology',
  '/search',
  '/inbox',
  '/profile',
  '/settings',
  '/help',
  '/support',
]);

/**
 * Normalizes custom-scheme URLs before Expo Router resolves the first screen.
 * This closes the cold-launch race where JavaScript link listeners are not yet
 * subscribed. Authorization and resource ownership remain AppRouteGuard work.
 */
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    if (!path.startsWith('atlas:')) return path;
    if (path.length > 768) return '/+not-found';
    const url = new URL(path);
    if (url.username || url.password || url.hash) return '/+not-found';
    if (publicAuthRoutes.has(url.hostname) && !url.search)
      return `/(auth)/${url.hostname}`;
    if (!url.search && url.pathname.replace(/\/+$/u, '') === '') {
      const alias = staticAliases.get(url.hostname);
      if (alias) return alias;
    }
    if (
      url.hostname === '' &&
      !url.search &&
      canonicalStaticPaths.has(url.pathname.replace(/\/+$/u, ''))
    )
      return url.pathname.replace(/\/+$/u, '');
    if (url.hostname === 'reset-password') {
      const token = url.searchParams.get('token');
      if (
        token === null ||
        !/^[A-Za-z0-9._~-]{16,512}$/u.test(token) ||
        [...url.searchParams.keys()].some((key) => key !== 'token')
      )
        return '/(auth)/reset-password';
      return `/(auth)/reset-password?token=${encodeURIComponent(token)}`;
    }
    if (url.hostname === 'verification') {
      const token = url.pathname.replace(/^\/+|\/+$/gu, '');
      if (!/^[A-Za-z0-9._~-]{16,512}$/u.test(token)) return '/+not-found';
      return `/(auth)/verification?token=${encodeURIComponent(token)}`;
    }
    if (url.hostname === 'symbol' && !url.search) {
      const symbol = url.pathname.replace(/^\/+|\/+$/gu, '');
      return /^[A-Z0-9.]{1,24}$/u.test(symbol)
        ? `/symbol/${symbol}`
        : '/+not-found';
    }
    if (url.hostname === '' && url.pathname === '/legal') return '/legal';
    if (url.hostname === '' && url.pathname === '/(onboarding)')
      return '/(onboarding)';
    return path;
  } catch {
    return '/+not-found';
  }
}
