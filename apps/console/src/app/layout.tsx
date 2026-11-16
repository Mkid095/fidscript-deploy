import type { Metadata } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { cookies } from 'next/headers';

import { AppProviders } from '@/components/ui/app-providers';

import './globals.css';

// The guide's typefaces. The CSS variable names are kept from the previous
// setup, so every component that already reads var(--font-geist-sans) /
// var(--font-geist-mono) picks up the new families without a change.
const geistSans = Plus_Jakarta_Sans({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = JetBrains_Mono({
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
  const theme =
    (await cookies()).get('fidscript_theme')?.value === 'light'
      ? 'light'
      : 'dark';

  return (
    <html lang="en" className={theme === 'light' ? 'light' : 'dark'}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
