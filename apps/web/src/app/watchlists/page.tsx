import type { Metadata } from 'next';

import { WatchlistsWorkspace } from '@/features/portfolio/watchlists-workspace';

export const metadata: Metadata = { title: 'Watchlist’ler · Project Atlas' };

export default function WatchlistsPage() {
  return <WatchlistsWorkspace />;
}
