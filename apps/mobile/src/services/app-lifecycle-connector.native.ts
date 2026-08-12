import { AppState, type AppStateStatus } from 'react-native';
import type {
  AppLifecycleController,
  AppLifecycleState,
} from './app-lifecycle';

function mapAppState(state: AppStateStatus): AppLifecycleState {
  if (state === 'active') return 'active';
  if (state === 'background') return 'background';
  return 'inactive';
}

export function connectAppLifecycle(
  controller: AppLifecycleController,
): () => void {
  controller.transition(mapAppState(AppState.currentState));
  const subscription = AppState.addEventListener('change', (state) => {
    controller.transition(mapAppState(state));
  });
  return () => subscription.remove();
}
