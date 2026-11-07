import Link from 'next/link';

/**
 * The shell the auth screens sit in.
 *
 * A card in the middle of the page: one thing to do, nothing else to look
 * at.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 text-center">
          <Link href="/" className="text-sm font-bold uppercase tracking-widest text-text">
            fidscript
          </Link>
        </div>
        <div className="rounded-xl border border-rail bg-surface p-6 shadow-lg sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
