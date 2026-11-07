import React from 'react';

/**
 * A table.
 *
 * Eighteen of them were hand-rolled in the dashboard, and most of them
 * overflowed the viewport on a phone: one wrapper had `overflow-hidden`
 * (which **clips** the columns) and the rest had no wrapper at all.
 *
 * This one scrolls sideways rather than clipping, keeps the header on a
 * single line, and says what a table is for.
 */
interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** What the table is about — announced before the rows. */
  caption?: React.ReactNode;
  /** Whether the table is a list of things (the default) or of data. */
  layout?: 'auto' | 'fixed';
}

export function Table({ caption, layout = 'auto', className = '', children, ...props }: TableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={`w-full text-sm border-collapse ${layout === 'fixed' ? 'table-fixed' : ''} ${className}`}
        {...props}
      >
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function THead({ className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`border-b border-[var(--rail)] ${className}`} {...props} />;
}

export function TBody({ className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={`divide-y divide-[var(--rail)] ${className}`} {...props} />;
}

export function TR({ className = '', ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`transition-colors hover:bg-[var(--hover)] ${className}`} {...props} />;
}

export function TH({
  className = '',
  align = 'left',
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-${align} text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)] whitespace-nowrap ${className}`}
      {...props}
    />
  );
}

export function TD({
  className = '',
  align = 'left',
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <td
      className={`px-4 py-3 text-${align} text-[var(--text)] align-middle ${className}`}
      {...props}
    />
  );
}
