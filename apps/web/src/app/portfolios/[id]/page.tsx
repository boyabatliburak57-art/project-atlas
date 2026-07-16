import type { Metadata } from 'next';

import { PortfolioOverviewWorkspace } from '@/features/portfolio/portfolio-overview-workspace';

export const metadata: Metadata = { title: 'Portföy özeti | Project Atlas' };

export default async function PortfolioOverviewPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PortfolioOverviewWorkspace portfolioId={id} />;
}
