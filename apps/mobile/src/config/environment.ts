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

export function parseMobileEnvironment(
  input: Readonly<Record<string, string | undefined>>,
  options: { readonly release: boolean },
): MobileEnvironment {
  const localDefault =
    options.release || input['EXPO_PUBLIC_APP_ENV'] !== undefined
      ? undefined
      : 'http://127.0.0.1:3001/api/v1';
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
  return result.data;
}

export function currentMobileEnvironment(): MobileEnvironment {
  return parseMobileEnvironment(process.env, {
    release: process.env['NODE_ENV'] === 'production',
  });
}
