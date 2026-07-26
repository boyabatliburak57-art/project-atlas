'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AtlasShell } from '../portfolio/atlas-shell';
import {
  helpArticles,
  helpCategories,
  searchHelp,
  type HelpArticle,
} from './catalog';
import { DemoPanel } from './demo-panel';

export function HelpCenter() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('Tümü');
  const articles = useMemo(() => {
    const found = query.trim().length >= 2 ? searchHelp(query) : helpArticles;
    return category === 'Tümü'
      ? found
      : found.filter((article) => article.category === category);
  }, [category, query]);

  return (
    <AtlasShell>
      <main className="trust-center">
        <header className="trust-heading">
          <p className="eyebrow">Atlas yardım merkezi</p>
          <h1>Ürünü, veriyi ve sonuçların sınırlarını anlayın.</h1>
          <p>
            Sürümlü Türkçe rehberler, finans sözlüğü ve güvenli demo kaynakları.
          </p>
          <label>
            Yardım merkezinde ara
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Örn. data cutoff, VaR veya scanner"
              type="search"
              value={query}
            />
          </label>
          <p aria-live="polite" role="status">
            {articles.length} makale bulundu.
          </p>
        </header>
        <nav aria-label="Yardım kategorileri" className="trust-links">
          {['Tümü', ...helpCategories].map((item) => (
            <button
              aria-pressed={category === item}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>
        <section aria-label="Yardım makaleleri" className="trust-method-grid">
          {articles.map((article) => (
            <ArticleCard article={article} key={article.slug} />
          ))}
        </section>
        {articles.length === 0 && (
          <section className="empty-state">
            <strong>Sonuç bulunamadı.</strong>
            <p>Başka bir terim deneyin veya kategori filtresini temizleyin.</p>
            <button onClick={() => setCategory('Tümü')} type="button">
              Tüm kategorileri göster
            </button>
          </section>
        )}
        <DemoPanel />
      </main>
    </AtlasShell>
  );
}

function ArticleCard({ article }: { readonly article: HelpArticle }) {
  return (
    <article>
      <p className="eyebrow">{article.category}</p>
      <h2>
        <Link href={`/help/${article.slug}`}>{article.title}</Link>
      </h2>
      <p>{article.summary}</p>
      <small>
        {article.locale} · {article.version} · Son güncelleme{' '}
        {article.lastUpdated}
      </small>
    </article>
  );
}
