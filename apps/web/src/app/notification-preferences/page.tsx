import type { Metadata } from 'next';

import { PreferencesWorkspace } from '@/features/portfolio/preferences-workspace';

export const metadata: Metadata = {
  title: 'Bildirim tercihleri · Project Atlas',
};

export default function NotificationPreferencesPage() {
  return <PreferencesWorkspace />;
}
