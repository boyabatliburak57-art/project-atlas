export type AppLifecycleState = 'active' | 'background' | 'inactive';

export class AppLifecycleController {
  private state: AppLifecycleState = 'active';
  private readonly foregroundListeners = new Set<() => void>();

  transition(next: AppLifecycleState): void {
    const wasForeground = this.state === 'active';
    this.state = next;
    if (!wasForeground && next === 'active') {
      for (const listener of this.foregroundListeners) listener();
    }
  }

  onForeground(listener: () => void): () => void {
    this.foregroundListeners.add(listener);
    return () => this.foregroundListeners.delete(listener);
  }
}
