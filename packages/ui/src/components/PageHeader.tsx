import React from 'react';

/**
 * The top of a screen.
 *
 * A title, what the screen is for, and what the person can do here. The
 * same shape on every screen is what makes a product legible: the reader
 * knows where they are before they read a word.
 */
export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** The primary action, and any others, on the right. */
  actions?: React.ReactNode;
  /** Above the title — a breadcrumb, usually. */
  above?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  above,
  className = '',
}: PageHeaderProps) {
  return (
    <header className={`mb-5 ${className}`}>
      {above && <div className="mb-2">{above}</div>}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[var(--text)] truncate">{title}</h1>
          {description && (
            <p className="text-sm text-[var(--text-muted)] mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </header>
  );
}

/**
 * The top of a section — a smaller heading inside a screen.
 */
export function SectionHeader({
  title,
  description,
  actions,
  className = '',
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 mb-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
        {description && (
          <p className="text-xs text-[var(--text-dim)] mt-0.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
