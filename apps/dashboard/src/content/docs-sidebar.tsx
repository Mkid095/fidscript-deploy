import { HugeiconsIcon } from '@hugeicons/react';
import type { Doc } from './docs-hooks';
import { DOCS } from './docs-hooks';

interface Props {
  currentSlug?: string;
  onNavigate?: (slug: string) => void;
}

const CATEGORIES = ['Get Started', 'Build', 'Reference'];

export function DocsSidebar({ currentSlug, onNavigate }: Props) {
  return (
    <aside className="w-56 flex-shrink-0 border-r border-[var(--rail)] overflow-y-auto py-4 px-2">
      {CATEGORIES.map(category => {
        const docs = DOCS.filter(d => d.category === category);
        if (docs.length === 0) return null;
        return (
          <div key={category} className="mb-6 last:mb-0">
            <p className="text-[10px] font-semibold tracking-wider text-[var(--text-dim)] uppercase mb-2 px-2">
              {category}
            </p>
            <nav className="space-y-0.5">
              {docs.map(doc => {
                const active = doc.slug === currentSlug;
                return (
                  <button
                    key={doc.slug}
                    onClick={() => onNavigate?.(doc.slug)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${
                      active
                        ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
                    }`}
                  >
                    <HugeiconsIcon icon={doc.icon} size={14} className="flex-shrink-0" />
                    <span className="truncate">{doc.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        );
      })}
    </aside>
  );
}
