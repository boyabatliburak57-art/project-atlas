import type {
  StrategyDefinition,
  StrategyRepository,
  StrategyRevisionStatus,
  StrategyWithRevision,
} from './contracts.js';
import { StrategyDomainError } from './errors.js';
import { validateStrategyDefinition } from './validation.js';

export interface CreateStrategyRequest {
  readonly userId: string;
  readonly name: string;
  readonly description?: string | null | undefined;
  readonly definition: unknown;
  readonly status?: StrategyRevisionStatus | undefined;
}

export interface ReviseStrategyRequest {
  readonly userId: string;
  readonly id: string;
  readonly expectedRevision: number;
  readonly name?: string | undefined;
  readonly description?: string | null | undefined;
  readonly definition?: unknown;
  readonly status?: StrategyRevisionStatus | undefined;
}

export interface StrategyApplicationDependencies {
  readonly repository: StrategyRepository;
  readonly now?: (() => Date) | undefined;
}

export class StrategyApplicationService {
  private readonly now: () => Date;

  constructor(private readonly dependencies: StrategyApplicationDependencies) {
    this.now = dependencies.now ?? (() => new Date());
  }

  async get(userId: string, id: string): Promise<StrategyWithRevision> {
    return this.requireOwned(userId, id);
  }

  async revisions(userId: string, id: string) {
    await this.requireOwned(userId, id);
    return this.dependencies.repository.listRevisions(id);
  }

  async create(request: CreateStrategyRequest): Promise<StrategyWithRevision> {
    const validated = requireValidDefinition(request.definition);
    return this.dependencies.repository.create({
      ownerUserId: request.userId,
      name: normalizeName(request.name),
      description: normalizeDescription(request.description),
      definition: validated.definition,
      revisionStatus: request.status ?? 'draft',
      validation: validated.validation,
      createdBy: request.userId,
      now: this.now(),
    });
  }

  async revise(request: ReviseStrategyRequest): Promise<StrategyWithRevision> {
    const current = await this.requireOwned(request.userId, request.id);
    if (current.status === 'deleted') {
      throw new StrategyDomainError('STRATEGY_DELETED');
    }
    const validated =
      request.definition === undefined
        ? {
            definition: current.revision.definition,
            validation: current.revision.validation,
          }
        : requireValidDefinition(request.definition);
    const revised = await this.dependencies.repository.revise({
      id: request.id,
      ownerUserId: request.userId,
      expectedRevision: request.expectedRevision,
      name:
        request.name === undefined ? current.name : normalizeName(request.name),
      description:
        request.description === undefined
          ? current.description
          : normalizeDescription(request.description),
      definition: validated.definition,
      revisionStatus: request.status ?? current.revision.status,
      validation: validated.validation,
      createdBy: request.userId,
      now: this.now(),
    });
    if (revised.outcome === 'conflict') {
      throw new StrategyDomainError('STRATEGY_REVISION_CONFLICT', {
        expectedRevision: request.expectedRevision,
        currentRevision: current.currentRevision,
      });
    }
    return revised.strategy;
  }

  async clone(userId: string, id: string): Promise<StrategyWithRevision> {
    const source = await this.requireOwned(userId, id);
    if (source.status === 'deleted') {
      throw new StrategyDomainError('STRATEGY_DELETED');
    }
    return this.dependencies.repository.create({
      ownerUserId: userId,
      name: normalizeName(`${source.name} (Copy)`),
      description: source.description,
      definition: source.revision.definition,
      revisionStatus: source.revision.status,
      validation: source.revision.validation,
      createdBy: userId,
      now: this.now(),
      clonedFrom: {
        strategyId: source.id,
        revision: source.currentRevision,
      },
    });
  }

  private async requireOwned(
    userId: string,
    id: string,
  ): Promise<StrategyWithRevision> {
    const strategy = await this.dependencies.repository.findById(id);
    if (strategy === null) throw new StrategyDomainError('STRATEGY_NOT_FOUND');
    if (strategy.ownerUserId !== userId) {
      throw new StrategyDomainError('STRATEGY_ACCESS_DENIED');
    }
    return strategy;
  }
}

function requireValidDefinition(value: unknown): {
  readonly definition: StrategyDefinition;
  readonly validation: ReturnType<typeof validateStrategyDefinition>;
} {
  const validation = validateStrategyDefinition(value);
  if (!validation.valid || validation.normalizedDefinition === undefined) {
    throw new StrategyDomainError('STRATEGY_INVALID', {
      validationErrors: validation.errors,
    });
  }
  return { definition: validation.normalizedDefinition, validation };
}

function normalizeName(value: string): string {
  const name = value.trim();
  if (name.length === 0 || name.length > 160) {
    throw new StrategyDomainError('STRATEGY_INVALID', { path: '/name' });
  }
  return name;
}

function normalizeDescription(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const description = value.trim();
  if (description.length > 4_000) {
    throw new StrategyDomainError('STRATEGY_INVALID', {
      path: '/description',
    });
  }
  return description === '' ? null : description;
}
