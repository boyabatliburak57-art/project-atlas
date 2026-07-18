import type { Metadata } from 'next';

import { ExperimentDetailWorkspace } from '@/features/strategy-lab/strategy-lab-workspaces';

export const metadata: Metadata = {
  title: 'Deney karşılaştırması | Project Atlas',
};
export default async function Page({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExperimentDetailWorkspace id={id} />;
}
