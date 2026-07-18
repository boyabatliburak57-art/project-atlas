import type { Metadata } from 'next';

import { StrategyEditorWorkspace } from '@/features/strategy-lab/strategy-lab-workspaces';

export const metadata: Metadata = { title: 'Strateji | Project Atlas' };
export default async function Page({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StrategyEditorWorkspace strategyId={id} />;
}
