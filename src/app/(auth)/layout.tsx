import Image from 'next/image';
import Link from 'next/link';

/**
 * The shell the auth screens sit in.
 *
 * One thing to do, nothing else to look at: the logo, the card, and the
 * way back to the front door.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex-shrink-0 border-b border-rail px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5"
          aria-label="FIDScript — the front door"
        >
          <Image src="/logo.png" alt="" width={26} height={26} className="rounded-md" />
          <span className="text-sm font-bold uppercase tracking-widest text-text">fidscript</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px]">
          <div className="rounded-xl border border-rail bg-surface p-6 shadow-lg sm:p-8">
            {children}
          </div>
          <p className="mt-6 text-center text-xs text-text-dim">
            Your own application cloud — the data, the mail, the messages and the packages, on
            your own hardware.
          </p>
        </div>
      </main>
    </div>
  );
}
