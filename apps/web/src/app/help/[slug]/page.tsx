import { HelpArticle } from '@/features/help/help-article';

export default async function HelpArticlePage({
  params,
}: {
  readonly params: Promise<{ slug: string }>;
}) {
  return <HelpArticle slug={(await params).slug} />;
}
