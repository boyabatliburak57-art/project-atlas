import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const EMAIL_VERIFICATION_DELIVERY = Symbol(
  'EMAIL_VERIFICATION_DELIVERY',
);

export interface EmailVerificationDelivery {
  deliver(input: {
    readonly expiresAt: Date;
    readonly locale: 'tr-TR';
    readonly recipient: string;
    readonly token: string;
  }): Promise<void>;
}

@Injectable()
export class SandboxEmailVerificationDelivery implements EmailVerificationDelivery {
  private readonly environment: string;

  constructor(config: ConfigService) {
    this.environment = config.getOrThrow<string>('ATLAS_ENV');
  }

  deliver(input: {
    readonly expiresAt: Date;
    readonly locale: 'tr-TR';
    readonly recipient: string;
    readonly token: string;
  }): Promise<void> {
    void input;
    if (this.environment === 'production')
      throw new ServiceUnavailableException({
        code: 'VERIFICATION_DELIVERY_UNAVAILABLE',
        message: 'Verification delivery is unavailable',
      });
    // Sandbox boundary intentionally performs no logging and persists no raw
    // token. Test compositions may replace this adapter with a private inbox.
    return Promise.resolve();
  }
}
