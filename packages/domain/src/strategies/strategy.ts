import type {
  Strategy,
  StrategyDefinition,
  StrategyRevision,
  StrategyRevisionStatus,
  StrategyStatus,
  StrategyValidationResult,
} from './contracts.js';
import { StrategyDomainError } from './errors.js';

export interface CreateStrategyEntityInput {
  readonly id: string;
  readonly ownerUserId: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: StrategyStatus;
  readonly currentRevision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

export interface CreateStrategyRevisionInput {
  readonly id: string;
  readonly strategyId: string;
  readonly revision: number;
  readonly definition: StrategyDefinition;
  readonly status: StrategyRevisionStatus;
  readonly validation: StrategyValidationResult;
  readonly createdBy: string;
  readonly createdAt: Date;
}

export function createStrategyEntity(
  input: CreateStrategyEntityInput,
): Strategy {
  assertIdentifier(input.id, 'id');
  assertIdentifier(input.ownerUserId, 'ownerUserId');
  if (input.name.trim().length === 0 || input.name.length > 160)
    invalid('name');
  if (input.description !== null && input.description.length > 4_000) {
    invalid('description');
  }
  if (!Number.isInteger(input.currentRevision) || input.currentRevision < 1) {
    invalid('currentRevision');
  }
  assertDate(input.createdAt, 'createdAt');
  assertDate(input.updatedAt, 'updatedAt');
  if (input.updatedAt.getTime() < input.createdAt.getTime())
    invalid('updatedAt');
  if ((input.status === 'deleted') !== (input.deletedAt !== null)) {
    invalid('deletedAt');
  }
  return deepFreeze({
    id: input.id,
    ownerUserId: input.ownerUserId,
    name: input.name,
    description: input.description,
    visibility: 'private',
    status: input.status,
    currentRevision: input.currentRevision,
    createdAt: new Date(input.createdAt),
    updatedAt: new Date(input.updatedAt),
    deletedAt: input.deletedAt === null ? null : new Date(input.deletedAt),
  });
}

export function createStrategyRevision(
  input: CreateStrategyRevisionInput,
): StrategyRevision {
  assertIdentifier(input.id, 'id');
  assertIdentifier(input.strategyId, 'strategyId');
  assertIdentifier(input.createdBy, 'createdBy');
  if (!Number.isInteger(input.revision) || input.revision < 1) {
    invalid('revision');
  }
  if (
    !input.validation.valid ||
    input.validation.normalizedDefinition === undefined
  ) {
    invalid('validation');
  }
  if (input.status === 'validated' && !input.validation.valid) {
    invalid('status');
  }
  assertDate(input.createdAt, 'createdAt');
  return deepFreeze({
    id: input.id,
    strategyId: input.strategyId,
    revision: input.revision,
    definition: clone(input.definition),
    status: input.status,
    validation: clone(input.validation),
    createdBy: input.createdBy,
    createdAt: new Date(input.createdAt),
  });
}

export function assertExpectedStrategyRevision(
  currentRevision: number,
  expectedRevision: number,
): void {
  if (currentRevision !== expectedRevision) {
    throw new StrategyDomainError('STRATEGY_REVISION_CONFLICT', {
      expectedRevision,
      currentRevision,
    });
  }
}

function assertIdentifier(value: string, field: string): void {
  if (value.trim().length === 0 || value.length > 160) invalid(field);
}

function assertDate(value: Date, field: string): void {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    invalid(field);
  }
}

function invalid(field: string): never {
  throw new StrategyDomainError('STRATEGY_INVALID', { field });
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}
