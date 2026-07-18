import type { Metadata } from 'next';

import { StrategiesWorkspace } from '@/features/strategy-lab/strategy-lab-workspaces';

export const metadata: Metadata = { title: 'Stratejiler | Project Atlas' };
export default function Page() {
  return <StrategiesWorkspace />;
}
