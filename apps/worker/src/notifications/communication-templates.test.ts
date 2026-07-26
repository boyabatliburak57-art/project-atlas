import { describe, expect, it } from 'vitest';

import {
  CommunicationTemplateRegistry,
  deliveryAllowed,
} from './communication-templates';

describe('immutable tr-TR communication templates', () => {
  const registry = new CommunicationTemplateRegistry();

  it('registers every required communication family at immutable version one', () => {
    expect(registry.list().map(({ code }) => code)).toEqual([
      'email-verification',
      'password-reset',
      'security-alert',
      'alert-triggered',
      'report-ready',
      'import-failed',
      'account-deletion',
      'backtest-completed',
      'experiment-completed',
    ]);
    expect(registry.list().every((item) => item.version === 1)).toBe(true);
  });

  it('renders Turkish verification e-mail and escapes active content', () => {
    const result = registry.render({
      code: 'email-verification',
      locale: 'tr-TR',
      variables: {
        actionUrl: 'https://atlas.example/verify?token=<secret>',
        expiresIn: '15 dakika',
      },
      version: 1,
    });
    expect(result.subject).toBe('E-posta adresinizi doğrulayın');
    expect(result.html).toContain('&lt;secret&gt;');
    expect(result.html).not.toContain('<secret>');
  });

  it('keeps reset tokens out of subject', () => {
    const result = registry.render({
      code: 'password-reset',
      locale: 'tr-TR',
      variables: { actionUrl: 'https://atlas.example/reset?token=sensitive' },
      version: 1,
    });
    expect(result.subject).not.toContain('sensitive');
    expect(result.subject).not.toContain('token=');
  });

  it('renders alert, report, import and lifecycle templates', () => {
    const cases = [
      [
        'alert-triggered',
        {
          body: 'Eşik aşıldı',
          dataTime: '2026-07-26T10:00:00Z',
          disclaimer: 'Yatırım tavsiyesi değildir.',
          symbol: 'THYAO',
          title: 'Fiyat uyarısı',
        },
      ],
      [
        'report-ready',
        {
          actionUrl: 'https://atlas.example/reports/1',
          reportName: 'Portföy',
        },
      ],
      ['import-failed', { importName: 'İşlemler' }],
      ['account-deletion', { status: 'bekleme süresinde' }],
    ] as const;
    for (const [code, variables] of cases)
      expect(
        registry.render({ code, locale: 'tr-TR', variables, version: 1 })
          .contentHash,
      ).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('rejects unknown locale and version instead of falling back silently', () => {
    expect(() =>
      registry.render({
        code: 'password-reset',
        locale: 'en-US',
        variables: { actionUrl: 'https://atlas.example/reset' },
        version: 1,
      }),
    ).toThrow('COMMUNICATION_TEMPLATE_NOT_FOUND');
  });

  it('requires every declared template variable', () => {
    expect(() =>
      registry.render({
        code: 'alert-triggered',
        locale: 'tr-TR',
        variables: {},
        version: 1,
      }),
    ).toThrow('COMMUNICATION_TEMPLATE_VARIABLE_MISSING');
  });

  it('honors alert and optional preferences', () => {
    expect(
      deliveryAllowed({
        category: 'alert',
        emailAlertsEnabled: false,
        optionalEmailEnabled: true,
      }),
    ).toBe(false);
    expect(
      deliveryAllowed({
        category: 'optional',
        emailAlertsEnabled: true,
        optionalEmailEnabled: false,
      }),
    ).toBe(false);
  });

  it('never disables security e-mail through unsubscribe preferences', () => {
    expect(
      deliveryAllowed({
        category: 'security',
        emailAlertsEnabled: false,
        optionalEmailEnabled: false,
      }),
    ).toBe(true);
  });
});
