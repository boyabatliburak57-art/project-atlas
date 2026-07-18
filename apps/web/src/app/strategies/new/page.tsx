import type { Metadata } from 'next';

import { StrategyEditorWorkspace } from '@/features/strategy-lab/strategy-lab-workspaces';

export const metadata: Metadata = { title: 'Yeni strateji | Project Atlas' };
export default function Page() {
  return <StrategyEditorWorkspace />;
}
