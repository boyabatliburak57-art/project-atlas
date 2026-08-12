import { useEffect, useMemo, useRef, type PropsWithChildren } from 'react';
import {
  router,
  useGlobalSearchParams,
  usePathname,
  useSegments,
} from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { palette, spacing } from '@atlas/design-tokens';
import { useAuth } from '../providers/auth-provider';
import { linkingFoundation } from '../services/native-platform';
import {
  consumeTokenDeepLink,
  gateDeepLink,
  parseDeepLink,
  type DeepLinkTarget,
} from './deep-links';

function resourcePath(target: DeepLinkTarget): string {
  switch (target.kind) {
    case 'symbol':
      return `/symbol/${target.id}`;
    case 'scan-result':
      return `/scanner?runId=${target.id}`;
    case 'watchlist':
    case 'alert':
      return `/watchlists?resourceId=${target.id}`;
    case 'portfolio':
      return `/portfolio-risk?resourceId=${target.id}`;
    case 'strategy':
    case 'backtest':
      return `/strategies?resourceId=${target.id}`;
    case 'report':
    case 'support':
      return `/reports?resourceId=${target.id}`;
  }
}

function ownershipPath(target: DeepLinkTarget): string | null {
  switch (target.kind) {
    case 'symbol':
      return null;
    case 'scan-result':
      return `/scanner/runs/${target.id}`;
    case 'watchlist':
      return `/watchlists/${target.id}`;
    case 'alert':
      return `/alerts/${target.id}`;
    case 'portfolio':
      return `/portfolios/${target.id}`;
    case 'strategy':
      return `/strategies/${target.id}`;
    case 'backtest':
      return `/backtests/${target.id}`;
    case 'report':
      return `/reports/${target.id}`;
    case 'support':
      return `/support/requests/${target.id}`;
  }
}

export function AppRouteGuard({ children }: PropsWithChildren) {
  const auth = useAuth();
  const pathname = usePathname();
  const segments = useSegments();
  const parameters = useGlobalSearchParams<{ fixture?: string }>();
  const routeGroup = segments[0];
  const testHarness =
    __DEV__ &&
    (parameters.fixture === '1' ||
      pathname.startsWith('/symbol/') ||
      pathname === '/component-catalog' ||
      pathname === '/preferences' ||
      routeGroup === '(onboarding)');
  const initialLinkConsumed = useRef(false);
  const pendingResourceLink = useRef<DeepLinkTarget | null>(null);
  const authRoute = routeGroup === '(auth)';
  const onboardingRoute = routeGroup === '(onboarding)';
  const publicRoute =
    authRoute ||
    [
      '/welcome',
      '/legal',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/session-expired',
      '/account-locked',
      '/verification',
      '/verify-email',
    ].includes(pathname);
  const authenticated =
    auth.state.status === 'authenticated' ||
    auth.state.status === 'verificationRequired';
  const preferences = useQuery({
    queryKey: [
      'private',
      authenticated && 'session' in auth.state
        ? auth.state.session.userId
        : 'anonymous',
      'preferences',
    ],
    queryFn: () => auth.preferencesApi.get(),
    enabled: auth.state.status === 'authenticated',
  });
  const onboardingComplete =
    preferences.data?.onboardingState.status === 'completed';

  useEffect(() => {
    if (testHarness) return;
    if (auth.state.status === 'initializing') return;
    if (
      auth.state.status === 'unauthenticated' ||
      auth.state.status === 'unavailable'
    ) {
      if (!publicRoute) router.replace('/welcome');
      return;
    }
    if (auth.state.status === 'reauthenticationRequired') {
      if (pathname !== '/session-expired')
        router.replace('/(auth)/session-expired');
      return;
    }
    if (auth.state.status === 'locked') {
      if (pathname !== '/account-locked')
        router.replace('/(auth)/account-locked');
      return;
    }
    if (auth.state.status === 'verificationRequired') {
      if (!(authRoute && segments[1] === 'verification'))
        router.replace('/(auth)/verification');
      return;
    }
    if (preferences.isPending) return;
    if (!onboardingComplete && !onboardingRoute) {
      router.replace('/(onboarding)');
      return;
    }
    if (onboardingComplete && (publicRoute || onboardingRoute))
      router.replace('/(tabs)/home');
  }, [
    auth.state.status,
    authRoute,
    onboardingComplete,
    onboardingRoute,
    pathname,
    preferences.isPending,
    publicRoute,
    segments,
    testHarness,
  ]);

  useEffect(() => {
    if (
      auth.state.status !== 'authenticated' ||
      !onboardingComplete ||
      pendingResourceLink.current === null
    )
      return;
    const target = pendingResourceLink.current;
    pendingResourceLink.current = null;
    const path = ownershipPath(target);
    void (async () => {
      try {
        if (path !== null)
          await auth.client.request({ path, timeoutMs: 10_000 });
        router.replace(resourcePath(target) as never);
      } catch {
        router.replace('/+not-found');
      }
    })();
  }, [auth.client, auth.state.status, onboardingComplete]);

  useEffect(() => {
    const handle = async (url: string) => {
      if (__DEV__ && url.includes('fixture=1')) return;
      if (__DEV__ && /^atlas:\/\/component-catalog\/?$/u.test(url)) {
        router.replace('/component-catalog');
        return;
      }
      if (__DEV__ && /^atlas:\/\/\/preferences\/?$/u.test(url)) {
        router.replace('/preferences');
        return;
      }
      if (/^atlas:\/\/\/?verification\/?$/u.test(url)) {
        router.replace('/(auth)/verification');
        return;
      }
      try {
        const legacyTokenUrl = new URL(url);
        if (legacyTokenUrl.hostname === 'reset-password') {
          const token = legacyTokenUrl.searchParams.get('token');
          if (
            token !== null &&
            /^[A-Za-z0-9._~-]{16,512}$/u.test(token) &&
            [...legacyTokenUrl.searchParams.keys()].every(
              (key) => key === 'token',
            )
          ) {
            router.replace({
              pathname: '/(auth)/reset-password',
              params: { token },
            });
          } else router.replace('/(auth)/reset-password');
          return;
        }
      } catch {
        router.replace('/+not-found');
        return;
      }
      // Expo Router owns public/static application routes. The security layer only
      // interprets token and resource links. Explicit mapping avoids treating a
      // normal app route as an invalid resource and racing Expo Router.
      if (url.startsWith('atlas:///(onboarding)')) {
        if (__DEV__) router.replace('/(onboarding)');
        else router.replace('/welcome');
        return;
      }
      if (url === 'atlas:///legal') {
        router.replace('/legal');
        return;
      }
      const publicRouteMatch =
        /^atlas:\/\/(forgot-password|session-expired|account-locked|register)\/?$/u.exec(
          url,
        );
      if (publicRouteMatch !== null) {
        router.replace(`/(auth)/${publicRouteMatch[1]}` as never);
        return;
      }
      if (__DEV__ && url.startsWith('atlas://symbol/')) return;
      if (
        consumeTokenDeepLink(url, (target) => {
          router.replace({
            pathname:
              target.kind === 'verification'
                ? '/(auth)/verification'
                : '/(auth)/reset-password',
            params: { token: target.token },
          });
        })
      )
        return;
      const target = parseDeepLink(url);
      if (target === null) {
        router.replace('/+not-found');
        return;
      }
      const gated = gateDeepLink(target, {
        authenticated: auth.state.status === 'authenticated',
        onboardingComplete,
      });
      if (gated.destination === 'auth') {
        pendingResourceLink.current = target;
        router.replace('/(auth)/login');
      } else if (gated.destination === 'onboarding') {
        pendingResourceLink.current = target;
        router.replace('/(onboarding)');
      } else {
        const path = ownershipPath(target);
        try {
          if (path !== null)
            await auth.client.request({ path, timeoutMs: 10_000 });
          router.replace(resourcePath(target) as never);
        } catch {
          router.replace('/+not-found');
        }
      }
    };
    if (!initialLinkConsumed.current) {
      initialLinkConsumed.current = true;
      void linkingFoundation.initialUrl().then(async (url) => {
        if (url !== null) await handle(url);
      });
    }
    return linkingFoundation.subscribe((url) => void handle(url));
  }, [auth.client, auth.state.status, onboardingComplete]);

  const blocked = useMemo(() => {
    if (testHarness) return false;
    if (auth.state.status === 'initializing') return true;
    if (auth.state.status === 'authenticated' && preferences.isPending)
      return true;
    if (!authenticated && !publicRoute) return true;
    if (
      auth.state.status === 'verificationRequired' &&
      !(authRoute && segments[1] === 'verification')
    )
      return true;
    if (
      auth.state.status === 'authenticated' &&
      !onboardingComplete &&
      !onboardingRoute
    )
      return true;
    return false;
  }, [
    auth.state.status,
    authenticated,
    onboardingComplete,
    onboardingRoute,
    pathname,
    preferences.isPending,
    publicRoute,
    authRoute,
    segments,
    testHarness,
  ]);

  if (blocked)
    return (
      <View accessibilityRole="progressbar" style={styles.loading}>
        <ActivityIndicator />
        <Text>Güvenli oturum hazırlanıyor</Text>
      </View>
    );
  return children;
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: palette.background,
    flex: 1,
    gap: spacing[12],
    justifyContent: 'center',
  },
});
