import type { SecureStorage } from '../storage/secure-storage';

export interface InstallationMarkerStore {
  exists(): Promise<boolean>;
  create(): Promise<void>;
}

export class InstallationGuard {
  constructor(
    private readonly marker: InstallationMarkerStore,
    private readonly secureStorage: SecureStorage,
  ) {}

  async enforce(): Promise<'existing' | 'initialized'> {
    if (await this.marker.exists()) return 'existing';
    await this.secureStorage.clearAuth();
    await this.marker.create();
    return 'initialized';
  }
}
