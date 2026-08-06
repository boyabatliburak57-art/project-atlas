import type { AtlasApiClient, AtlasResponse } from '@atlas/api-client';
import type { AuthSession } from './auth-session';
import { normalizeEmail } from './auth-contracts';

interface LoginResponse {
  readonly emailVerificationRequired: boolean;
  readonly expiresAt: string;
  readonly roles: readonly string[];
  readonly sessionToken: string;
  readonly userId: string;
}

export class MobileAuthApi {
  constructor(private readonly client: AtlasApiClient) {}

  async login(email: string, password: string): Promise<AuthSession> {
    const response = await this.client.request<AtlasResponse<LoginResponse>>({
      body: { email: normalizeEmail(email), password },
      method: 'POST',
      path: '/auth/login',
    });
    return {
      expiresAt: response.data.expiresAt,
      emailVerificationRequired: response.data.emailVerificationRequired,
      roles: response.data.roles,
      token: response.data.sessionToken,
      userId: response.data.userId,
    };
  }

  verificationStatus(): Promise<
    AtlasResponse<{
      deliveryMode: 'SANDBOX_INTEGRATION';
      maskedEmail: string;
      reasonCode: string;
      resendAvailableAt: string | null;
      verified: boolean;
      verifiedAt: string | null;
    }>
  > {
    return this.client.request({
      method: 'GET',
      path: '/auth/email-verification/status',
    });
  }

  resendVerification(): Promise<
    AtlasResponse<{ accepted: true; resendAvailableAt: string }>
  > {
    return this.client.request({
      body: {},
      method: 'POST',
      path: '/auth/email-verification/resend',
    });
  }

  confirmVerification(
    token: string,
  ): Promise<AtlasResponse<{ alreadyVerified: boolean; verified: true }>> {
    return this.client.request({
      body: { token },
      method: 'POST',
      path: '/auth/email-verification/confirm',
    });
  }

  requestPasswordReset(
    email: string,
  ): Promise<AtlasResponse<{ accepted: true }>> {
    return this.client.request({
      body: { email: normalizeEmail(email) },
      method: 'POST',
      path: '/auth/password-reset/request',
    });
  }

  confirmPasswordReset(token: string, password: string): Promise<void> {
    return this.client.request({
      body: { password, token },
      method: 'POST',
      path: '/auth/password-reset/confirm',
    });
  }

  logout(): Promise<void> {
    return this.client.request({ method: 'POST', path: '/auth/logout' });
  }
}
