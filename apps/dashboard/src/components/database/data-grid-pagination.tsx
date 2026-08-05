'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { PAGE_SIZE } from './data-grid-utils';

interface DataGridPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}

export function DataGridPagination({
  page, totalPages, total, onPage,
}: DataGridPaginationProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--rail)] bg-[var(--surface)] flex-shrink-0 text-xs text-[var(--text-dim)]">
      <span>
        Page {page} of {totalPages} · {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
      </span>
      <div className="flex gap-1.5">
        <button
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-2.5 py-1 rounded border border-[var(--rail)] disabled:opacity-40 hover:text-[var(--text)] flex items-center gap-1"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={12} />Prev
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
          if (pageNum > totalPages) return null;
          return (
            <button
              key={pageNum}
              onClick={() => onPage(pageNum)}
              className={`w-8 py-1 rounded border ${page === pageNum ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)]'}`}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-2.5 py-1 rounded border border-[var(--rail)] disabled:opacity-40 hover:text-[var(--text)] flex items-center gap-1"
        >
          Next<HugeiconsIcon icon={ArrowRight01Icon} size={12} />
        </button>
      </div>
    </div>
  );
}
