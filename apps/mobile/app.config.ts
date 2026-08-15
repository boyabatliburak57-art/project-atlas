import type { ConfigContext, ExpoConfig } from 'expo/config';

const appEnvironment = process.env['EXPO_PUBLIC_APP_ENV'] ?? 'local';
const e2eMode = process.env['EXPO_PUBLIC_E2E_MODE'] === 'true';
const scheme = process.env['EXPO_PUBLIC_DEEP_LINK_SCHEME'] ?? 'atlas';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Atlas Mobile',
  slug: 'atlas-mobile',
  scheme,
  version: '0.1.0',
  orientation: 'portrait',
  platforms: ['ios'],
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.atlasfinance.mobile',
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      LSSupportsOpeningDocumentsInPlace: false,
      NSFaceIDUsageDescription:
        'Atlas, yalnızca etkinleştirdiğiniz yerel uygulama kilidini açmak için Face ID kullanır.',
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
        NSAllowsLocalNetworking: appEnvironment !== 'production',
      },
      UIFileSharingEnabled: false,
    },
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
    e2eMode,
    identifierStatus: 'PLACEHOLDER_NOT_STORE_APPROVED',
    backgroundRefresh: 'NOT_REQUIRED_FOR_V1',
    universalLinks: 'EXTERNAL_CONFIGURATION_REQUIRED',
  },
});
