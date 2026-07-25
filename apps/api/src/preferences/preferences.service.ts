import {
  defaultOnboardingState,
  normalizeOnboardingState,
  ONBOARDING_STEPS,
  type OnboardingState,
} from '@atlas/domain';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { z } from 'zod';

import type {
  OnboardingCommandDto,
  UpdatePreferencesDto,
} from './preferences.dto';
import { PreferencesRepository } from './preferences.repository';

const quietHoursSchema = z
  .object({
    enabled: z.boolean(),
    startMinute: z.number().int().min(0).max(1439).nullable(),
    endMinute: z.number().int().min(0).max(1439).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    const complete =
      value.startMinute !== null &&
      value.endMinute !== null &&
      value.startMinute !== value.endMinute;
    if (value.enabled !== complete)
      context.addIssue({ code: 'custom', message: 'quiet hours inconsistent' });
  });
const onboardingSchema = z
  .object({
    status: z.enum(['not_started', 'in_progress', 'skipped', 'completed']),
    currentStep: z.enum(ONBOARDING_STEPS),
    completedSteps: z.array(z.enum(ONBOARDING_STEPS)).max(8),
    demoDataRequested: z.boolean(),
    completedAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();
const updateSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    locale: z.enum(['tr-TR', 'en-US']).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    dateFormat: z.enum(['dd.MM.yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd']).optional(),
    numberFormat: z.enum(['tr-TR', 'en-US']).optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    defaultMarket: z.enum(['BIST']).optional(),
    defaultBenchmark: z.string().trim().min(1).max(32).optional(),
    defaultChartAdjustment: z.enum(['adjusted', 'unadjusted']).optional(),
    defaultTimeframe: z.enum(['1d', '1w', '1mo']).optional(),
    notificationChannels: z
      .array(z.enum(['in_app', 'email']))
      .min(1)
      .max(2)
      .optional(),
    quietHours: quietHoursSchema.optional(),
    accessibility: z.object({ reducedMotion: z.boolean() }).strict().optional(),
    display: z
      .object({
        compactTable: z.boolean(),
        methodologyDetailLevel: z.enum(['summary', 'standard', 'detailed']),
      })
      .strict()
      .optional(),
    onboarding: onboardingSchema.optional(),
  })
  .strict();

@Injectable()
export class PreferencesService {
  constructor(private readonly repository: PreferencesRepository) {}

  async get(userId: string) {
    return (await this.repository.find(userId)) ?? defaults(userId);
  }

  async update(userId: string, input: UpdatePreferencesDto) {
    const value = parse(updateSchema, input);
    if (value.timezone !== undefined && !validTimezone(value.timezone))
      invalid('timezone');
    const { expectedVersion, onboarding, ...changes } = value;
    const normalized =
      onboarding === undefined
        ? undefined
        : normalizeOnboardingState(onboarding);
    const current = await this.repository.find(userId);
    if (current === null) {
      if (expectedVersion !== 1) conflict();
      const created = await this.repository.create(userId, {
        ...changes,
        ...(normalized === undefined ? {} : { onboardingState: normalized }),
      });
      if (created !== null) return created;
    }
    const updated = await this.repository.update(userId, expectedVersion, {
      ...changes,
      ...(normalized === undefined ? {} : { onboardingState: normalized }),
    });
    if (updated === null) conflict();
    return updated;
  }

  async onboarding(userId: string) {
    const preferences = await this.get(userId);
    return { ...preferences.onboardingState, version: preferences.version };
  }

  async complete(userId: string, input: OnboardingCommandDto) {
    const command = parse(
      z.object({
        expectedVersion: z.number().int().positive(),
        demoDataRequested: z.boolean().optional(),
      }),
      input,
    );
    const state: OnboardingState = {
      status: 'completed',
      currentStep: 'summary',
      completedSteps: ONBOARDING_STEPS,
      demoDataRequested: command.demoDataRequested ?? false,
      completedAt: new Date().toISOString(),
    };
    return this.update(userId, {
      expectedVersion: command.expectedVersion,
      onboarding: state,
    });
  }

  async reset(userId: string, input: OnboardingCommandDto) {
    const command = parse(
      z.object({ expectedVersion: z.number().int().positive() }),
      input,
    );
    return this.update(userId, {
      expectedVersion: command.expectedVersion,
      onboarding: defaultOnboardingState(),
    });
  }
}

function defaults(userId: string) {
  const now = new Date();
  return {
    userId,
    locale: 'tr-TR',
    timezone: 'Europe/Istanbul',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: 'tr-TR',
    currency: 'TRY',
    defaultMarket: 'BIST',
    defaultBenchmark: 'XU100',
    defaultChartAdjustment: 'adjusted',
    defaultTimeframe: '1d',
    notificationChannels: ['in_app', 'email'],
    quietHours: { enabled: false, startMinute: null, endMinute: null },
    accessibility: { reducedMotion: false },
    display: { compactTable: false, methodologyDetailLevel: 'standard' },
    onboardingState: defaultOnboardingState(),
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success)
    invalid(result.error.issues[0]?.path.join('.') ?? 'request');
  return result.data;
}
function invalid(field: string): never {
  throw new BadRequestException({
    code: 'PREFERENCES_INVALID',
    message: 'Preferences request is invalid',
    details: { field },
  });
}
function conflict(): never {
  throw new ConflictException({
    code: 'PREFERENCES_VERSION_CONFLICT',
    message: 'Preferences were changed by another request',
  });
}
function validTimezone(value: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
