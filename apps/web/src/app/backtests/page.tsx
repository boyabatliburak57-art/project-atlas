import type { Metadata } from 'next';
import { Suspense } from 'react';

import { BacktestsWorkspace } from '@/features/strategy-lab/strategy-lab-workspaces';

export const metadata: Metadata = { title: 'Backtestler | Project Atlas' };
export default function Page() {
  return (
    <Suspense>
      <BacktestsWorkspace />
    </Suspense>
  );
}
