'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { BoltIcon, Menu02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons';

import { DocsSidebar } from '@/components/docs/docs-sidebar';

export default function DocsLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="sticky top-0 z-50 border-b border-slate-900 bg-ink-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen((v) => !v)}
              className="rounded-lg border border-slate-800 p-1.5 text-slate-300 lg:hidden"
              aria-label="Toggle navigation"
            >
              <HugeiconsIcon icon={Menu02Icon} size={18} color="currentColor" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-fire-500/30 bg-fire-500/10 text-fire-500">
                <HugeiconsIcon icon={BoltIcon} size={15} color="currentColor" />
              </span>
              <span className="font-mono font-bold text-white">
                FID<span className="text-fire-500">Script</span>
              </span>
              <span className="ml-1 text-xs font-medium text-slate-500">/ Docs</span>
            </Link>
          </div>
          <Link href="/" className="group flex items-center gap-1 text-xs text-slate-400 transition hover:text-white">
            Back to site
            <HugeiconsIcon icon={ArrowRight02Icon} size={13} color="currentColor" className="transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8 lg:flex lg:gap-10">
        {/* Sidebar: static on desktop, drawer on mobile */}
        {open && (
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-slate-900 bg-ink-900 p-5 transition-transform lg:static lg:z-0 lg:w-64 lg:translate-x-0 lg:border-r-0 lg:bg-transparent lg:p-0 ${
            open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <DocsSidebar onNavigate={() => setOpen(false)} />
        </aside>

        <main className="min-w-0 flex-1 pt-2 lg:pt-0">{children}</main>
      </div>
    </div>
  );
}
