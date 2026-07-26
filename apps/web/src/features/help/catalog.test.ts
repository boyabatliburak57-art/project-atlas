import { describe, expect, it } from 'vitest';

import {
  findHelpArticle,
  helpArticles,
  helpCategories,
  searchHelp,
} from './catalog';

describe('versioned localized help catalog', () => {
  it('contains every required category with version, locale and update date', () => {
    expect(helpCategories).toEqual(
      expect.arrayContaining([
        'Getting started',
        'Market and symbols',
        'Scanner',
        'Watchlists and alerts',
        'Portfolio and risk',
        'Fundamentals and patterns',
        'Strategy Lab and backtesting',
        'Reports and exports',
        'Data freshness and methodology',
        'Account and security',
        'Troubleshooting',
        'FAQ',
      ]),
    );
    expect(
      helpArticles.every(
        ({ lastUpdated, locale, version }) =>
          lastUpdated === '2026-07-26' &&
          locale === 'tr-TR' &&
          version === 'help-v1',
      ),
    ).toBe(true);
  });

  it('searches Turkish content and glossary terms deterministically', () => {
    expect(searchHelp('data cutoff')[0]?.slug).toBe('veri-tazeligi-metodoloji');
    expect(searchHelp('XIRR').map(({ slug }) => slug)).toContain('glossary');
    expect(searchHelp('x')).toEqual([]);
  });

  it('resolves related article detail without dangling links', () => {
    for (const article of helpArticles)
      for (const related of article.related)
        expect(findHelpArticle(related)).toBeDefined();
  });
});
