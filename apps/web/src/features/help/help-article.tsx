import Link from 'next/link';

import { findHelpArticle } from './catalog';

export function HelpArticle({ slug }: { readonly slug: string }) {
  const article = findHelpArticle(slug);
  if (article === undefined)
    return (
      <main className="trust-center">
        <h1>Makale bulunamadı</h1>
        <Link href="/help">Yardım merkezine dön</Link>
      </main>
    );
  return (
    <main className="trust-center">
      <nav aria-label="Breadcrumb">
        <Link href="/help">Yardım merkezi</Link> / {article.category}
      </nav>
      <article className="trust-section">
        <header>
          <p className="eyebrow">{article.category}</p>
          <h1>{article.title}</h1>
          <p>{article.summary}</p>
          <small>
            {article.locale} · {article.version} · Son güncelleme{' '}
            {article.lastUpdated}
          </small>
        </header>
        {article.content.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </article>
      <nav aria-label="İlgili makaleler" className="trust-links">
        {article.related.map((related) => {
          const target = findHelpArticle(related);
          return target ? (
            <Link href={`/help/${target.slug}`} key={target.slug}>
              {target.title}
            </Link>
          ) : null;
        })}
      </nav>
    </main>
  );
}

export function ContextualHelpLink({
  article,
  children = 'Nasıl çalışır?',
}: {
  readonly article: string;
  readonly children?: string;
}) {
  return <Link href={`/help/${article}`}>{children}</Link>;
}
