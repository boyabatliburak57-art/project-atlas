export type AppLockPolicy = 'off' | 'immediately' | 'shortGrace';
export type AppLockState = 'unlocked' | 'locked' | 'reauthenticationRequired';

export class AppLockController {
  private backgroundAt: number | null = null;
  private state: AppLockState = 'unlocked';

  constructor(
    private policy: AppLockPolicy,
    private readonly monotonicNow: () => number,
    private readonly graceMs = 30_000,
  ) {}

  setPolicy(policy: AppLockPolicy): void {
    this.policy = policy;
    if (policy === 'off') this.state = 'unlocked';
  }
  onBackground(): void {
    this.backgroundAt = this.monotonicNow();
    if (this.policy === 'immediately') this.state = 'locked';
  }
  onForeground(): AppLockState {
    if (
      this.policy === 'shortGrace' &&
      this.backgroundAt !== null &&
      this.monotonicNow() - this.backgroundAt >= this.graceMs
    )
      this.state = 'locked';
    return this.state;
  }
  unlock(result: 'success' | 'cancel' | 'failure' | 'lockout'): AppLockState {
    if (result === 'success') this.state = 'unlocked';
    else if (result === 'lockout' || result === 'failure')
      this.state = 'reauthenticationRequired';
    else this.state = 'locked';
    return this.state;
  }
  reset(): void {
    this.backgroundAt = null;
    this.state = 'unlocked';
  }
  snapshot(): AppLockState {
    return this.state;
  }
}
