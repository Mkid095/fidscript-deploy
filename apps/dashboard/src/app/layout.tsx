import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'FIDScript Deploy',
  description: 'Self-hosted Developer Operating System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#080a0d] text-slate-200 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
