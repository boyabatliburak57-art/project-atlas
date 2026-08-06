import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Geçerli bir e-posta adresi girin.'),
  password: z.string().min(1, 'Şifre gereklidir.').max(128),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(12, 'Şifre en az 12 karakter olmalıdır.').max(128),
    confirmation: z.string().max(128),
  })
  .refine((value) => value.password === value.confirmation, {
    message: 'Şifreler eşleşmiyor.',
    path: ['confirmation'],
  });

export type AuthFailureCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_VERIFICATION_REQUIRED'
  | 'ACCOUNT_LOCKED'
  | 'RATE_LIMITED'
  | 'SESSION_CONFLICT'
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK_UNAVAILABLE';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function safeAuthMessage(code: string): string {
  const messages: Record<AuthFailureCode, string> = {
    INVALID_CREDENTIALS: 'E-posta veya şifre doğrulanamadı.',
    EMAIL_VERIFICATION_REQUIRED:
      'Devam etmek için e-posta doğrulaması gerekiyor.',
    ACCOUNT_LOCKED: 'Hesap güvenlik nedeniyle geçici olarak kilitli.',
    RATE_LIMITED: 'Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.',
    SESSION_CONFLICT: 'Oturum değişti. Lütfen yeniden giriş yapın.',
    SERVICE_UNAVAILABLE: 'Giriş hizmeti şu anda kullanılamıyor.',
    NETWORK_UNAVAILABLE: 'Ağ bağlantısı kullanılamıyor.',
  };
  return (
    messages[code as AuthFailureCode] ?? 'İşlem güvenli şekilde tamamlanamadı.'
  );
}

export class SubmitGate {
  private pending = false;

  async run<T>(action: () => Promise<T>): Promise<T | undefined> {
    if (this.pending) return undefined;
    this.pending = true;
    try {
      return await action();
    } finally {
      this.pending = false;
    }
  }
}
