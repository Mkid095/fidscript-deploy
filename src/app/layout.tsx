import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { cookies } from 'next/headers';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'FIDScript',
    template: '%s · FIDScript',
  },
  description:
    'A control plane for your own hardware: install best-in-class applications once, and let every project switch on only what it needs.',
};

/**
 * The root layout.
 *
 * The theme is read from a cookie, so the server renders the right one and
 * there is no flash of the wrong theme on the first paint.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = (await cookies()).get('fidscript_theme')?.value === 'light' ? 'light' : 'dark';

  return (
    <html lang="en" className={theme === 'light' ? 'light' : 'dark'}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
