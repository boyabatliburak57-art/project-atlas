import type { PatternDefinition } from './contracts.js';

export class PatternRegistry {
  private readonly definitions = new Map<string, PatternDefinition<unknown>>();

  register<P>(definition: PatternDefinition<P>): this {
    const key = `${definition.code}@${definition.version}`;
    if (this.definitions.has(key))
      throw new Error(`Duplicate pattern definition: ${key}`);
    this.definitions.set(key, definition);
    return this;
  }

  resolve(code: string, version: number) {
    const definition = this.definitions.get(`${code}@${version}`);
    if (!definition)
      throw new Error(
        this.catalog().some((item) => item.code === code)
          ? 'PATTERN_VERSION_UNSUPPORTED'
          : 'PATTERN_NOT_FOUND',
      );
    return definition;
  }

  catalog() {
    return [...this.definitions.values()]
      .map((definition) => ({
        code: definition.code,
        version: definition.version,
        algorithmVersion: definition.algorithmVersion,
        category: definition.category,
        parameterSchema: definition.parameterSchema.metadata,
        minimumInput: definition.minimumInput,
        requiredFields: definition.requiredFields,
        evidenceSchema: definition.evidenceSchema,
        confirmationPolicy: definition.confirmationPolicy,
        invalidationPolicy: definition.invalidationPolicy,
        disclaimer:
          'Algorithmic candidate; not a prediction or investment advice.',
      }))
      .sort((a, b) => a.code.localeCompare(b.code) || a.version - b.version);
  }
}
