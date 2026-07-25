import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { QueryProvider } from '@/components/query-provider';
import { GlobalShell } from '@/features/navigation/global-shell';

import './globals.css';

export const metadata: Metadata = {
  title: 'Project Atlas',
  description: 'BIST tarama ve analiz platformu',
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="tr">
      <body>
        <QueryProvider>
          <GlobalShell>{children}</GlobalShell>
        </QueryProvider>
      </body>
    </html>
  );
}
