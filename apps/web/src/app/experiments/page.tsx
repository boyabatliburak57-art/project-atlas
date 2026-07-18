import type { Metadata } from 'next';

import { ExperimentsWorkspace } from '@/features/strategy-lab/strategy-lab-workspaces';

export const metadata: Metadata = {
  title: 'Araştırma deneyleri | Project Atlas',
};
export default function Page() {
  return <ExperimentsWorkspace />;
}
