'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';

import { DOCS } from '@/content/docs';

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  // Group docs by their declared category, preserving first-seen order.
  const categories: { name: string; docs: typeof DOCS }[] = [];
  for (const d of DOCS) {
    let cat = categories.find((c) => c.name === d.category);
    if (!cat) {
      cat = { name: d.category, docs: [] };
      categories.push(cat);
    }
    cat.docs.push(d);
  }

  return (
    <nav className="space-y-6">
      {categories.map((cat) => (
        <div key={cat.name}>
          <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {cat.name}
          </h3>
          <ul className="space-y-0.5">
            {cat.docs.map((d) => {
              const active = pathname === `/docs/${d.slug}`;
              return (
                <li key={d.slug}>
                  <Link
                    href={`/docs/${d.slug}`}
                    onClick={onNavigate}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                      active
                        ? 'border border-fire-500/30 bg-fire-500/10 text-fire-500'
                        : 'border border-transparent text-slate-400 hover:bg-ink-850 hover:text-white'
                    }`}
                  >
                    <HugeiconsIcon icon={d.icon} size={16} color="currentColor" />
                    {d.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
