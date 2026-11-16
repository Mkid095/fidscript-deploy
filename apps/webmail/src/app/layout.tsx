import type { ReactNode } from 'react';
import './globals.css';

/**
 * The root layout. The app is small and server-rendered; the navigation
 * lives in the pages that need it.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
