export type NetworkReasonCode =
  | 'ONLINE'
  | 'OFFLINE'
  | 'CONSTRAINED'
  | 'NETWORK_UNKNOWN';
export interface NetworkSnapshot {
  readonly status: 'online' | 'offline' | 'constrained' | 'unknown';
  readonly online: boolean;
  readonly reasonCode: NetworkReasonCode;
}

type Listener = (snapshot: NetworkSnapshot) => void;

export class NetworkStatusController {
  private snapshot: NetworkSnapshot = {
    status: 'unknown',
    online: false,
    reasonCode: 'NETWORK_UNKNOWN',
  };
  private readonly listeners = new Set<Listener>();

  current(): NetworkSnapshot {
    return this.snapshot;
  }

  setOnline(online: boolean): void {
    this.setStatus(online ? 'online' : 'offline');
  }

  setStatus(status: NetworkSnapshot['status']): void {
    if (status === this.snapshot.status) return;
    this.snapshot = {
      status,
      online: status === 'online',
      reasonCode:
        status === 'online'
          ? 'ONLINE'
          : status === 'offline'
            ? 'OFFLINE'
            : status === 'constrained'
              ? 'CONSTRAINED'
              : 'NETWORK_UNKNOWN',
    };
    for (const listener of this.listeners) listener(this.snapshot);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  listenerCount(): number {
    return this.listeners.size;
  }
}
