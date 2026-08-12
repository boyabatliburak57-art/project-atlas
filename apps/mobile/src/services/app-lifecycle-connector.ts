import type { AppLifecycleController } from './app-lifecycle';

export function connectAppLifecycle(
  controller: AppLifecycleController,
): () => void {
  void controller;
  return () => undefined;
}
