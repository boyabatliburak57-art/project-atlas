import { createStableParameterHash } from '../indicators/parameter-hash.js';

import type {
  StrategyParameterBinding,
  StrategyParameterDefinition,
  StrategyParameterValue,
} from './contracts.js';
import { StrategyDomainError } from './errors.js';

const parameterNamePattern = /^[a-z][a-zA-Z0-9_]{0,63}$/;

export function bindStrategyParameters(
  definitions: readonly StrategyParameterDefinition[],
  overrides: Readonly<Record<string, unknown>> = {},
): StrategyParameterBinding {
  const byName = new Map<string, StrategyParameterDefinition>();
  for (const definition of definitions) {
    validateDefinition(definition);
    if (byName.has(definition.name)) invalid(`/parameters/${definition.name}`);
    byName.set(definition.name, definition);
  }
  for (const name of Object.keys(overrides)) {
    if (!byName.has(name)) invalid(`/bindings/${name}`);
  }

  const values: Record<string, StrategyParameterValue> = {};
  for (const name of [...byName.keys()].sort((left, right) =>
    left.localeCompare(right, 'en-US'),
  )) {
    const definition = byName.get(name)!;
    const value = Object.prototype.hasOwnProperty.call(overrides, name)
      ? overrides[name]
      : definition.defaultValue;
    validateValue(definition, value);
    values[name] = value as StrategyParameterValue;
  }
  const frozenValues = Object.freeze({ ...values });
  return Object.freeze({
    values: frozenValues,
    hash: createStableParameterHash(frozenValues),
  });
}

export function isParameterDefinitionValid(
  definition: unknown,
): definition is StrategyParameterDefinition {
  if (
    typeof definition !== 'object' ||
    definition === null ||
    Array.isArray(definition)
  ) {
    return false;
  }
  try {
    validateDefinition(definition as StrategyParameterDefinition);
    return true;
  } catch {
    return false;
  }
}

function validateDefinition(definition: StrategyParameterDefinition): void {
  const value = definition as unknown as Record<string, unknown>;
  if (
    typeof value.name !== 'string' ||
    !parameterNamePattern.test(value.name)
  ) {
    invalid('/parameters/name');
  }
  const name = value.name;
  if (value.type === 'boolean') {
    if (typeof value.defaultValue !== 'boolean') {
      invalid(`/parameters/${name}/defaultValue`);
    }
    return;
  }
  if (value.type === 'enum') {
    if (!Array.isArray(value.values)) invalid(`/parameters/${name}/values`);
    const values = [...new Set(value.values as unknown[])];
    if (
      values.length === 0 ||
      values.length !== value.values.length ||
      values.some(
        (item) =>
          typeof item !== 'string' ||
          item.trim().length === 0 ||
          item.length > 64,
      ) ||
      typeof value.defaultValue !== 'string' ||
      !values.includes(value.defaultValue)
    ) {
      invalid(`/parameters/${name}`);
    }
    return;
  }
  if (value.type !== 'number' && value.type !== 'integer') {
    invalid(`/parameters/${name}/type`);
  }
  if (
    typeof value.minimum !== 'number' ||
    typeof value.maximum !== 'number' ||
    typeof value.defaultValue !== 'number' ||
    !Number.isFinite(value.minimum) ||
    !Number.isFinite(value.maximum) ||
    value.minimum > value.maximum ||
    !Number.isFinite(value.defaultValue) ||
    value.defaultValue < value.minimum ||
    value.defaultValue > value.maximum ||
    (value.type === 'integer' &&
      (!Number.isInteger(value.minimum) ||
        !Number.isInteger(value.maximum) ||
        !Number.isInteger(value.defaultValue)))
  ) {
    invalid(`/parameters/${name}`);
  }
}

function validateValue(
  definition: StrategyParameterDefinition,
  value: unknown,
): void {
  if (definition.type === 'boolean') {
    if (typeof value !== 'boolean') invalid(`/bindings/${definition.name}`);
    return;
  }
  if (definition.type === 'enum') {
    if (typeof value !== 'string' || !definition.values.includes(value)) {
      invalid(`/bindings/${definition.name}`);
    }
    return;
  }
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < definition.minimum ||
    value > definition.maximum ||
    (definition.type === 'integer' && !Number.isInteger(value))
  ) {
    invalid(`/bindings/${definition.name}`);
  }
}

function invalid(path: string): never {
  throw new StrategyDomainError('STRATEGY_PARAMETER_BINDING_INVALID', {
    path,
  });
}
