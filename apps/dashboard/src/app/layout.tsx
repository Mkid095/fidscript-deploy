import type { Metadata } from 'next';

import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'FIDScript — Self-Hosted Developer Operating System',
  description:
    'Turn any clean VPS into your private application cloud. Host apps, run realtime databases, edge functions, queues, cron, and mail — fully open source, on your own hardware.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-950 text-slate-200 antialiased selection:bg-fire-500 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
