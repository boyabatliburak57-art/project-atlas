const publicAuthRoutes = new Set([
  'account-locked',
  'forgot-password',
  'register',
  'session-expired',
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
