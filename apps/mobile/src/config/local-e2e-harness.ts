import Constants from 'expo-constants';

import { isLocalMobileE2EHarness } from './environment';

export function isRuntimeLocalMobileE2EHarness(): boolean {
  return isLocalMobileE2EHarness({
    EXPO_PUBLIC_E2E_MODE:
      process.env.EXPO_PUBLIC_E2E_MODE ??
      (Constants.expoConfig?.extra?.['e2eMode'] === true ? 'true' : undefined),
    EXPO_PUBLIC_APP_ENV:
      process.env.EXPO_PUBLIC_APP_ENV ??
      (typeof Constants.expoConfig?.extra?.['appEnvironment'] === 'string'
        ? Constants.expoConfig.extra['appEnvironment']
        : undefined),
  });
}
