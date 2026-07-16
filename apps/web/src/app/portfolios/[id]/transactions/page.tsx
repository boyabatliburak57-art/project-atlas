import type { Metadata } from 'next';

import { PortfolioTransactionsWorkspace } from '@/features/portfolio/portfolio-transactions-workspace';

export const metadata: Metadata = {
  title: 'Portföy işlemleri | Project Atlas',
};

export default async function PortfolioTransactionsPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PortfolioTransactionsWorkspace portfolioId={id} />;
}
