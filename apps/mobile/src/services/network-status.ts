export type NetworkReasonCode = 'ONLINE' | 'OFFLINE' | 'NETWORK_UNAVAILABLE';
export interface NetworkSnapshot {
  readonly online: boolean;
  readonly reasonCode: NetworkReasonCode;
}

type Listener = (snapshot: NetworkSnapshot) => void;

export class NetworkStatusController {
  private snapshot: NetworkSnapshot = { online: true, reasonCode: 'ONLINE' };
  private readonly listeners = new Set<Listener>();

  current(): NetworkSnapshot {
    return this.snapshot;
  }

  setOnline(online: boolean): void {
    this.snapshot = {
      online,
      reasonCode: online ? 'ONLINE' : 'OFFLINE',
    };
    for (const listener of this.listeners) listener(this.snapshot);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
