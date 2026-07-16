import type { Metadata } from 'next';

import { PortfoliosWorkspace } from '@/features/portfolio/portfolios-workspace';

export const metadata: Metadata = { title: 'Portföyler | Project Atlas' };

export default function PortfoliosPage() {
  return <PortfoliosWorkspace />;
}
