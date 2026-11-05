import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { BoltIcon, SourceCodeIcon, Login01Icon } from '@hugeicons/core-free-icons';

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '/docs', label: 'Docs' },
  { href: '#opensource', label: 'Open Source' },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--rail)] bg-[var(--surface)]/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]">
            <HugeiconsIcon icon={BoltIcon} size={18} color="currentColor" className="animate-pulse-slow" />
          </span>
          <span className="font-mono text-lg font-bold tracking-tight text-[var(--text)]">
            FID<span className="text-[var(--accent)]">Script</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) =>
            l.href.startsWith('#') ? (
              <a key={l.href} href={l.href} className="text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]">
                {l.label}
              </a>
            ) : (
              <Link key={l.href} href={l.href} className="text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]">
                {l.label}
              </Link>
            ),
          )}
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com/Mkid095/fidscript-deploy"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--rail)] px-3 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--rail-light)] hover:text-[var(--text)]"
          >
            <HugeiconsIcon icon={SourceCodeIcon} size={16} color="currentColor" /> Source
          </a>
          {/* The platform is already installed on the domain this page is
              served from, so the way in is one click away. */}
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--accent)]/20"
          >
            <HugeiconsIcon icon={Login01Icon} size={16} color="currentColor" /> Log in
          </Link>
        </div>
      </nav>
    </header>
  );
}
