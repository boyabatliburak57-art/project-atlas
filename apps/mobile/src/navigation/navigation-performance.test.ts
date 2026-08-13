import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { customerFeaturesForHub, primaryNavigation } from './feature-registry';

describe('navigation shell performance contract', () => {
  it('does not preload hub data or future feature modules', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, 'hub-screens.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/use(Query|InfiniteQuery|Mutation)/u);
    expect(source).not.toMatch(
      /features\/(institutional|settlement|viop|fund)/u,
    );
  });

  it('keeps 100 tab transitions bounded to five stable route keys', () => {
    const transitions = Array.from(
      { length: 20 },
      () => primaryNavigation,
    ).flat();
    expect(transitions).toHaveLength(100);
    expect(new Set(transitions.map((item) => item.routeName)).size).toBe(5);
  });

  it('does not duplicate customer entries while hubs are revisited', () => {
    const first = customerFeaturesForHub('radar').map((item) => item.id);
    for (let index = 0; index < 20; index += 1)
      expect(customerFeaturesForHub('radar').map((item) => item.id)).toEqual(
        first,
      );
  });
});
