export const providerOrder = [
  'ErrorBoundary',
  'SafeAreaProvider',
  'TelemetryProvider',
  'NetworkStatusProvider',
  'QueryClientProvider',
  'AuthSessionProvider',
  'PreferencesProvider',
  'FeatureFlagProvider',
  'LocaleProvider',
  'ThemeProvider',
  'NotificationProvider',
  'LinkingProvider',
] as const;

export function assertProviderOrder(
  order: readonly string[] = providerOrder,
): true {
  const query = order.indexOf('QueryClientProvider');
  const auth = order.indexOf('AuthSessionProvider');
  const flags = order.indexOf('FeatureFlagProvider');
  if (query < 0 || auth <= query || flags <= auth)
    throw new Error('INVALID_PROVIDER_ORDER');
  if (new Set(order).size !== order.length)
    throw new Error('DUPLICATE_PROVIDER');
  return true;
}
