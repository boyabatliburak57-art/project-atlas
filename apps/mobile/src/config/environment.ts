import { z } from 'zod';

const schema = z.object({
  EXPO_PUBLIC_API_BASE_URL: z.url(),
  EXPO_PUBLIC_APP_ENV: z.enum(['local', 'test', 'staging', 'production']),
  EXPO_PUBLIC_ENABLE_DEV_TOOLS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  EXPO_PUBLIC_DEEP_LINK_SCHEME: z
    .string()
    .regex(/^[a-z][a-z0-9+.-]{1,31}$/u)
    .default('atlas'),
  EXPO_PUBLIC_FEATURE_FLAG_MODE: z.literal('backend').default('backend'),
  EXPO_PUBLIC_TELEMETRY_DSN: z.url().optional().or(z.literal('')),
});

export type MobileEnvironment = z.infer<typeof schema>;

export function isLocalMobileE2EHarness(
  input?: Readonly<Record<string, string | undefined>>,
): boolean {
  const environment =
    input ??
    ({
      EXPO_PUBLIC_E2E_MODE: process.env.EXPO_PUBLIC_E2E_MODE,
      EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    } satisfies Readonly<Record<string, string | undefined>>);
  return (
    environment['EXPO_PUBLIC_E2E_MODE'] === 'true' &&
    environment['EXPO_PUBLIC_APP_ENV'] === 'local'
  );
}

export function parseMobileEnvironment(
  input: Readonly<Record<string, string | undefined>>,
  options: { readonly release: boolean },
): MobileEnvironment {
  const localDefault =
    options.release || input['EXPO_PUBLIC_APP_ENV'] !== undefined
      ? undefined
      : ['http://127.0.0.1', ':3001/api/v1'].join('');
  const result = schema.safeParse({
    ...input,
    EXPO_PUBLIC_API_BASE_URL: input['EXPO_PUBLIC_API_BASE_URL'] ?? localDefault,
    EXPO_PUBLIC_APP_ENV:
      input['EXPO_PUBLIC_APP_ENV'] ?? (options.release ? undefined : 'local'),
  });
  if (!result.success) {
    throw new Error(
      `Invalid mobile environment: ${result.error.issues
        .map((issue) => issue.path.join('.'))
        .join(', ')}`,
    );
  }
  assertEnvironmentTransport(result.data);
  return result.data;
}

function assertEnvironmentTransport(environment: MobileEnvironment): void {
  const url = new URL(environment.EXPO_PUBLIC_API_BASE_URL);
  if (environment.EXPO_PUBLIC_APP_ENV !== 'production') return;
  const forbiddenHost =
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname.endsWith('.local') ||
    /(?:^|[.-])(?:staging|preview|test|dev)(?:[.-]|$)/iu.test(url.hostname);
  if (
    url.protocol !== 'https:' ||
    forbiddenHost ||
    url.username ||
    url.password
  )
    throw new Error('Invalid mobile environment: production transport');
}

export function currentMobileEnvironment(): MobileEnvironment {
  const environment = {
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    EXPO_PUBLIC_ENABLE_DEV_TOOLS: process.env.EXPO_PUBLIC_ENABLE_DEV_TOOLS,
    EXPO_PUBLIC_DEEP_LINK_SCHEME: process.env.EXPO_PUBLIC_DEEP_LINK_SCHEME,
    EXPO_PUBLIC_FEATURE_FLAG_MODE: process.env.EXPO_PUBLIC_FEATURE_FLAG_MODE,
    EXPO_PUBLIC_TELEMETRY_DSN: process.env.EXPO_PUBLIC_TELEMETRY_DSN,
  };
  return parseMobileEnvironment(environment, {
    release: process.env.NODE_ENV === 'production',
  });
}
