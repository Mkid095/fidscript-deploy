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
          <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
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
                        ? 'border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border border-transparent text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
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
