import React from 'react';

export interface BreadcrumbItem {
  label: string;
  /** Where it goes. The last item is the current page and has no link. */
  href?: string;
}

/**
 * The way back.
 *
 * It is a `nav` with a label, so a screen reader announces it as the trail
 * it is, and the current page is marked with `aria-current`.
 *
 * The link is an anchor by default — this package knows nothing about the
 * framework the application uses. An application that routes on the client
 * passes its own `Link` through `linkComponent`.
 */
export function Breadcrumb({
  items,
  className = '',
  linkComponent: LinkComponent = 'a',
}: {
  items: BreadcrumbItem[];
  className?: string;
  /** The component the links are rendered with. */
  linkComponent?: React.ElementType;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5 min-w-0">
              {item.href && !last ? (
                <LinkComponent
                  href={item.href}
                  className="hover:text-[var(--text)] transition-colors truncate"
                >
                  {item.label}
                </LinkComponent>
              ) : (
                <span aria-current={last ? 'page' : undefined} className="truncate">
                  {item.label}
                </span>
              )}
              {!last && <span aria-hidden="true" className="text-[var(--text-dim)]">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
