export type AppLifecycleState = 'active' | 'background' | 'inactive';

export class AppLifecycleController {
  private state: AppLifecycleState = 'active';
  private readonly foregroundListeners = new Set<() => void>();
  private readonly stateListeners = new Set<
    (state: AppLifecycleState) => void
  >();

  transition(next: AppLifecycleState): void {
    if (next === this.state) return;
    const wasForeground = this.state === 'active';
    this.state = next;
    for (const listener of this.stateListeners) listener(next);
    if (!wasForeground && next === 'active') {
      for (const listener of this.foregroundListeners) listener();
    }
  }

  onForeground(listener: () => void): () => void {
    this.foregroundListeners.add(listener);
    return () => this.foregroundListeners.delete(listener);
  }

  onStateChange(listener: (state: AppLifecycleState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  snapshot(): AppLifecycleState {
    return this.state;
  }

  listenerCount(): number {
    return this.foregroundListeners.size + this.stateListeners.size;
  }
}
