import type { Metadata } from 'next';

import { AlertsWorkspace } from '@/features/portfolio/alerts-workspace';

export const metadata: Metadata = { title: 'Alarmlar · Project Atlas' };

export default function AlertsPage() {
  return <AlertsWorkspace />;
}
