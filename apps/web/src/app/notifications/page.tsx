import type { Metadata } from 'next';

import { NotificationsWorkspace } from '@/features/portfolio/notifications-workspace';

export const metadata: Metadata = { title: 'Bildirimler · Project Atlas' };

export default function NotificationsPage() {
  return <NotificationsWorkspace />;
}
