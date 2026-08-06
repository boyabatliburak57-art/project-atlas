import { AppState, type AppStateStatus } from 'react-native';

import {
  type AppLifecycleController,
  type AppLifecycleState,
} from './app-lifecycle';

function mapAppState(state: AppStateStatus): AppLifecycleState {
  if (state === 'active') return 'active';
  if (state === 'background') return 'background';
  return 'inactive';
}

export function connectExpoAppLifecycle(
  controller: AppLifecycleController,
): () => void {
  const subscription = AppState.addEventListener('change', (state) => {
    controller.transition(mapAppState(state));
  });
  return () => subscription.remove();
}
