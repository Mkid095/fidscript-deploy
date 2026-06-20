'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { BoltIcon, Menu02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons';

import { DocsSidebar } from '@/components/docs/docs-sidebar';

export default function DocsLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    // h-screen + overflow-hidden on the root => the sidebar and the content
    // area each get their OWN scroll region. Scrolling a long doc never moves
    // the sidebar (the user's actual complaint).
    <div className="flex h-screen flex-col overflow-hidden bg-ink-950">
      <header className="z-50 shrink-0 border-b border-slate-900 bg-ink-900/80 backdrop-blur-md">
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

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 overflow-hidden px-6">
        {/* mobile overlay */}
        {open && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

        {/* sidebar — own scroll region, stays fixed while content scrolls */}
        <aside
          className={`fixed bottom-0 left-0 top-14 z-50 w-72 overflow-y-auto border-r border-slate-900 bg-ink-900 p-5 transition-transform lg:static lg:top-0 lg:z-0 lg:w-64 lg:shrink-0 lg:translate-x-0 lg:border-r-0 lg:bg-transparent lg:p-0 lg:pr-8 ${
            open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <DocsSidebar onNavigate={() => setOpen(false)} />
        </aside>

        {/* content — independent scroll area */}
        <main className="min-w-0 flex-1 overflow-y-auto py-8">{children}</main>
      </div>
    </div>
  );
}
