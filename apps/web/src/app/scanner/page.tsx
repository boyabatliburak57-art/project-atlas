import type { Metadata } from 'next';

import { ScannerWorkspace } from '@/features/scanner/scanner-workspace';

export const metadata: Metadata = {
  title: 'Scanner · Project Atlas',
  description: 'BIST için kural tabanlı tarama çalışma alanı',
};

export default function ScannerPage() {
  return <ScannerWorkspace />;
}
