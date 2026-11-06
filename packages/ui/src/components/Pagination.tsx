import React from 'react';

interface PaginationProps {
  page: number;
  pages: number;
  total?: number;
  onChange: (page: number) => void;
  className?: string;
}

/**
 * The pages of a list.
 *
 * It says how many there are and where the person is, and it never leaves
 * them at a page that does not exist.
 */
export function Pagination({ page, pages, total, onChange, className = '' }: PaginationProps) {
  if (pages <= 1) return null;

  const around = [page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages);

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-between gap-3 text-xs ${className}`}
    >
      <span className="text-[var(--text-dim)]">
        Page {page} of {pages}
        {total !== undefined && ` · ${total} in total`}
      </span>
      <div className="flex items-center gap-1">
        <PageButton disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </PageButton>
        {around.map((p, index) => (
          <React.Fragment key={p}>
            {index > 0 && around[index - 1] !== p - 1 && (
              <span className="px-1 text-[var(--text-dim)]">…</span>
            )}
            <PageButton current={p === page} onClick={() => onChange(p)}>
              {p}
            </PageButton>
          </React.Fragment>
        ))}
        <PageButton disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </PageButton>
      </div>
    </nav>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  current,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  current?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={current ? 'page' : undefined}
      className={`
        inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2
        transition-colors duration-150
        focus:outline-none focus-visible:shadow-[var(--focus-ring)]
        disabled:opacity-40 disabled:cursor-not-allowed
        ${current
          ? 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--rail)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'}
      `}
    >
      {children}
    </button>
  );
}
