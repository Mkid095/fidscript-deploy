import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { BoltIcon, SourceCodeIcon } from '@hugeicons/core-free-icons';

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '/docs', label: 'Docs' },
  { href: '#opensource', label: 'Open Source' },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-900 bg-ink-900/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-fire-500/30 bg-fire-500/10 text-fire-500">
            <HugeiconsIcon icon={BoltIcon} size={18} color="currentColor" className="animate-pulse-slow" />
          </span>
          <span className="font-mono text-lg font-bold tracking-tight text-white">
            FID<span className="text-fire-500">Script</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) =>
            l.href.startsWith('#') ? (
              <a key={l.href} href={l.href} className="text-sm text-slate-400 transition hover:text-white">
                {l.label}
              </a>
            ) : (
              <Link key={l.href} href={l.href} className="text-sm text-slate-400 transition hover:text-white">
                {l.label}
              </Link>
            ),
          )}
        </div>

        <a
          href="https://github.com/Mkid095/fidscript-deploy"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-700 hover:text-white"
        >
          <HugeiconsIcon icon={SourceCodeIcon} size={16} color="currentColor" /> Source
        </a>
      </nav>
    </header>
  );
}
