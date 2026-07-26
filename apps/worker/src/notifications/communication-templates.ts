import { createHash } from 'node:crypto';

export type CommunicationCategory =
  | 'security'
  | 'transactional'
  | 'alert'
  | 'lifecycle'
  | 'optional';

export interface CommunicationTemplate {
  readonly code: string;
  readonly version: number;
  readonly locale: 'tr-TR';
  readonly category: CommunicationCategory;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
  readonly variables: readonly string[];
}

export interface RenderedCommunication {
  readonly code: string;
  readonly version: number;
  readonly locale: string;
  readonly category: CommunicationCategory;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
  readonly contentHash: string;
}

const templates = [
  template(
    'email-verification',
    'E-posta adresinizi doğrulayın',
    'E-posta adresinizi doğrulamak için {{actionUrl}} bağlantısını kullanın. Bağlantı {{expiresIn}} süreyle geçerlidir.',
    'security',
    ['actionUrl', 'expiresIn'],
  ),
  template(
    'password-reset',
    'Parola sıfırlama isteğiniz',
    'Parolanızı sıfırlamak için {{actionUrl}} bağlantısını kullanın. Bu isteği siz yapmadıysanız hesabınız güvendedir.',
    'security',
    ['actionUrl'],
  ),
  template(
    'security-alert',
    'Hesabınızla ilgili güvenlik bildirimi',
    '{{summary}} İşlem size ait değilse oturumlarınızı kapatın ve parolanızı değiştirin.',
    'security',
    ['summary'],
  ),
  template(
    'alert-triggered',
    'Atlas uyarınız tetiklendi',
    '{{title}}\n{{body}}\nVeri zamanı: {{dataTime}}\n{{disclaimer}}',
    'alert',
    ['title', 'body', 'dataTime', 'symbol', 'disclaimer'],
  ),
  template(
    'report-ready',
    'Atlas raporunuz hazır',
    '{{reportName}} raporu hazır. Güvenli indirme sayfası: {{actionUrl}}',
    'transactional',
    ['reportName', 'actionUrl'],
  ),
  template(
    'import-failed',
    'Atlas içe aktarma işlemi tamamlanamadı',
    '{{importName}} işlemi tamamlanamadı. Ayrıntıları Atlas içinden inceleyin.',
    'transactional',
    ['importName'],
  ),
  template(
    'account-deletion',
    'Hesap silme işlemi güncellendi',
    'Hesap silme isteğinizin durumu: {{status}}. Ayrıntıları Atlas güvenlik sayfasından inceleyin.',
    'lifecycle',
    ['status'],
  ),
  template(
    'backtest-completed',
    'Backtest işleminiz tamamlandı',
    '{{name}} backtest işlemi tamamlandı. Sonuçları Atlas içinden inceleyin.',
    'optional',
    ['name'],
  ),
  template(
    'experiment-completed',
    'Deney çalışmanız tamamlandı',
    '{{name}} deney çalışması tamamlandı. Sonuçları Atlas içinden inceleyin.',
    'optional',
    ['name'],
  ),
] as const satisfies readonly CommunicationTemplate[];

export class CommunicationTemplateRegistry {
  private readonly byIdentity = new Map(
    templates.map((item) => [
      `${item.code}:${item.version}:${item.locale}`,
      item,
    ]),
  );

  list(): readonly CommunicationTemplate[] {
    return templates;
  }

  render(input: {
    readonly code: string;
    readonly version: number;
    readonly locale: string;
    readonly variables: Readonly<Record<string, string>>;
  }): RenderedCommunication {
    const selected = this.byIdentity.get(
      `${input.code}:${input.version}:${input.locale}`,
    );
    if (selected === undefined)
      throw new Error('COMMUNICATION_TEMPLATE_NOT_FOUND');
    for (const name of selected.variables)
      if (input.variables[name] === undefined)
        throw new Error('COMMUNICATION_TEMPLATE_VARIABLE_MISSING');
    const subject = interpolate(selected.subject, input.variables, false);
    const text = interpolate(selected.text, input.variables, false);
    const html = interpolate(selected.html, input.variables, true);
    assertSafeSubject(subject);
    assertSafeHtml(html);
    return {
      category: selected.category,
      code: selected.code,
      contentHash: createHash('sha256')
        .update(`${subject}\u0000${text}\u0000${html}`)
        .digest('hex'),
      html,
      locale: selected.locale,
      subject,
      text,
      version: selected.version,
    };
  }
}

export function deliveryAllowed(input: {
  readonly category: CommunicationCategory;
  readonly emailAlertsEnabled: boolean;
  readonly optionalEmailEnabled: boolean;
}): boolean {
  if (input.category === 'security') return true;
  if (input.category === 'alert') return input.emailAlertsEnabled;
  if (input.category === 'optional') return input.optionalEmailEnabled;
  return true;
}

function template(
  code: string,
  subject: string,
  text: string,
  category: CommunicationCategory,
  variables: readonly string[],
): CommunicationTemplate {
  return {
    category,
    code,
    html: `<p>${text.replaceAll('\n', '</p><p>')}</p>`,
    locale: 'tr-TR',
    subject,
    text,
    variables,
    version: 1,
  };
}

function interpolate(
  source: string,
  variables: Readonly<Record<string, string>>,
  html: boolean,
): string {
  return source.replaceAll(/\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/gu, (_, name) => {
    const value = variables[String(name)] ?? '';
    return html ? escapeHtml(value) : replaceControlCharacters(value);
  });
}

function replaceControlCharacters(value: string): string {
  return [...value]
    .map((character) => (character.codePointAt(0)! < 32 ? ' ' : character))
    .join('');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function assertSafeSubject(subject: string): void {
  if (/[\r\n]/u.test(subject) || subject.length > 255)
    throw new Error('COMMUNICATION_SUBJECT_UNSAFE');
  if (
    /(password|parola|token|bearer|portfolio value|portföy değeri)[=:]\s*\S+/iu.test(
      subject,
    )
  )
    throw new Error('COMMUNICATION_SUBJECT_SENSITIVE');
}

function assertSafeHtml(html: string): void {
  if (
    /<(script|iframe|object|embed|form|style|link|meta)\b|on[a-z]+\s*=|(?:javascript|data):/iu.test(
      html,
    )
  )
    throw new Error('COMMUNICATION_TEMPLATE_ACTIVE_CONTENT');
}
