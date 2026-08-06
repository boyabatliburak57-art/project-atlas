import type { ConfigContext, ExpoConfig } from 'expo/config';

const appEnvironment = process.env['EXPO_PUBLIC_APP_ENV'] ?? 'local';
const scheme = process.env['EXPO_PUBLIC_DEEP_LINK_SCHEME'] ?? 'atlas';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Atlas Mobile',
  slug: 'atlas-mobile',
  scheme,
  version: '0.1.0',
  orientation: 'default',
  platforms: ['ios', 'android'],
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.atlasfinance.mobile',
    supportsTablet: false,
  },
  android: {
    package: 'com.atlasfinance.mobile',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-local-authentication',
    [
      'expo-notifications',
      {
        defaultChannel: 'atlas-general',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appEnvironment,
    identifierStatus: 'PLACEHOLDER_NOT_STORE_APPROVED',
  },
});
