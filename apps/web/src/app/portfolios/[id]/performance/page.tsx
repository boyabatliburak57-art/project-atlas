import type { Metadata } from 'next';

import { PortfolioPerformanceWorkspace } from '@/features/portfolio/portfolio-performance-workspace';

export const metadata: Metadata = {
  title: 'Portföy performansı | Project Atlas',
};

export default async function PortfolioPerformancePage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PortfolioPerformanceWorkspace portfolioId={id} />;
}
