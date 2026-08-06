import type {
  AtlasApiErrorShape,
  SessionCredentialProvider,
} from '@atlas/api-client';
import {
  AUTH_SESSION_KEY,
  type SecureStorage,
} from '../../storage/secure-storage';

export interface AuthSession {
  readonly emailVerificationRequired?: boolean;
  readonly expiresAt: string;
  readonly roles: readonly string[];
  readonly token: string;
  readonly userId: string;
}

export type AuthState =
  | { readonly status: 'initializing' }
  | { readonly status: 'unauthenticated' }
  | { readonly status: 'authenticated'; readonly session: AuthSession }
  | { readonly status: 'verificationRequired'; readonly session: AuthSession }
  | { readonly status: 'onboardingRequired'; readonly session: AuthSession }
  | { readonly status: 'reauthenticationRequired' }
  | { readonly status: 'locked' }
  | { readonly status: 'unavailable' };

type Listener = (state: AuthState) => void;

export class AuthSessionController implements SessionCredentialProvider {
  private state: AuthState = { status: 'initializing' };
  private readonly listeners = new Set<Listener>();
  private restorePromise: Promise<AuthState> | null = null;

  constructor(
    private readonly storage: SecureStorage,
    private readonly clearPrivateCache: () => Promise<void>,
    private readonly cleanupDeviceState: () => Promise<void> = () =>
      Promise.resolve(),
  ) {}

  snapshot(): AuthState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async restore(now = new Date()): Promise<AuthState> {
    if (this.restorePromise !== null) return this.restorePromise;
    this.restorePromise = this.restoreInternal(now).finally(() => {
      this.restorePromise = null;
    });
    return this.restorePromise;
  }

  private async restoreInternal(now: Date): Promise<AuthState> {
    let raw: string | null;
    try {
      raw = await this.storage.getItem(AUTH_SESSION_KEY);
    } catch {
      await this.clearPrivateCache();
      return this.publish({ status: 'unavailable' });
    }
    if (raw === null) return this.publish({ status: 'unauthenticated' });
    try {
      const session = JSON.parse(raw) as AuthSession;
      if (
        typeof session.token !== 'string' ||
        typeof session.userId !== 'string' ||
        !Array.isArray(session.roles) ||
        Number.isNaN(Date.parse(session.expiresAt))
      ) {
        await this.logout();
        return this.state;
      }
      if (new Date(session.expiresAt) <= now) {
        await this.storage.clearAuth();
        await this.clearPrivateCache();
        return this.publish({ status: 'reauthenticationRequired' });
      }
      return this.publish({
        status: session.emailVerificationRequired
          ? 'verificationRequired'
          : 'authenticated',
        session,
      });
    } catch {
      await this.logout();
      return this.state;
    }
  }

  async establish(session: AuthSession): Promise<void> {
    await this.storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    this.publish({
      status: session.emailVerificationRequired
        ? 'verificationRequired'
        : 'authenticated',
      session,
    });
  }

  async logout(): Promise<void> {
    await this.storage.clearAuth();
    await this.clearPrivateCache();
    await this.cleanupDeviceState();
    this.publish({ status: 'unauthenticated' });
  }

  getToken(): Promise<string | null> {
    return Promise.resolve(
      this.state.status === 'authenticated' ||
        this.state.status === 'verificationRequired'
        ? this.state.session.token
        : null,
    );
  }

  async onUnauthorized(error: AtlasApiErrorShape): Promise<void> {
    void error;
    await this.storage.clearAuth();
    await this.clearPrivateCache();
    await this.cleanupDeviceState();
    this.publish({ status: 'reauthenticationRequired' });
  }

  onForeground(now = new Date()): Promise<AuthState> {
    return this.restore(now);
  }

  private publish(state: AuthState): AuthState {
    this.state = state;
    for (const listener of this.listeners) listener(state);
    return state;
  }
}
