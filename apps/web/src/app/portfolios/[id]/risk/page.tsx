import type { Metadata } from 'next';

import { PortfolioRiskWorkspace } from '@/features/portfolio/portfolio-risk-workspace';

export const metadata: Metadata = { title: 'Portföy riski | Project Atlas' };

export default async function PortfolioRiskPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PortfolioRiskWorkspace portfolioId={id} />;
}
