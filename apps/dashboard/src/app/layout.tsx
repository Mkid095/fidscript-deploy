import type { Metadata } from 'next';

import './globals.css';
import { Providers } from './providers';
import { ThemeInitScript } from '@/components/theme/theme-init-script';

export const metadata: Metadata = {
  title: 'FIDScript — Self-Hosted Developer Operating System',
  description:
    'Turn any clean VPS into your private application cloud. Host apps, run realtime databases, edge functions, queues, cron, and mail — fully open source, on your own hardware.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
