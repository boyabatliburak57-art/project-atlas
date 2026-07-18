import type { Metadata } from 'next';

import { BacktestDetailWorkspace } from '@/features/strategy-lab/strategy-lab-workspaces';

export const metadata: Metadata = { title: 'Backtest sonucu | Project Atlas' };
export default async function Page({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BacktestDetailWorkspace id={id} />;
}
