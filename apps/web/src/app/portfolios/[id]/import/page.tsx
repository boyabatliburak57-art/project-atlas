import type { Metadata } from 'next';

import { PortfolioImportWorkspace } from '@/features/portfolio/portfolio-import-workspace';

export const metadata: Metadata = { title: 'CSV içe aktar | Project Atlas' };

export default async function PortfolioImportPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PortfolioImportWorkspace portfolioId={id} />;
}
