import Image from 'next/image';
import Link from 'next/link';

/**
 * The front door's navigation.
 *
 * Three things, and one of them is the way in. The applications are not
 * here: they are a one-time thing, and once the platform is installed they
 * live in its settings.
 */
export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-rail bg-surface/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="FIDScript home"
        >
          <Image
            src="/logo.png"
            alt=""
            width={28}
            height={28}
            className="rounded-md"
          />
          <span className="text-sm font-bold uppercase tracking-widest text-text">
            fidscript
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/docs"
            className="rounded-md px-3 py-1.5 text-sm text-text-muted transition hover:text-text"
          >
            Docs
          </Link>
          <a
            href="https://github.com/Mkid095/fidscript-deploy"
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-3 py-1.5 text-sm text-text-muted transition hover:text-text"
          >
            Source
          </a>
          <Link
            href="/login"
            className="ml-2 rounded-md border border-rail px-3 py-1.5 text-sm font-medium text-text transition hover:border-accent/40"
          >
            Log in
          </Link>
        </div>
      </nav>
    </header>
  );
}
