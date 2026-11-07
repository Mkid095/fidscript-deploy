'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/**
 * The sidebar, at every size.
 *
 * On a wide screen it is the column it always was. On a small screen the
 * column would take the screen's width away from the work — so it steps
 * aside: a button opens it over the page, and it goes away again when a
 * choice is made, the overlay is pressed, or Escape is typed.
 *
 * The shell owns this, not the screens: a screen cannot remember to be
 * readable on a phone when the frame puts its menu on top of it.
 */
export function ResponsiveSidebar({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // A choice made in the drawer is a navigation — the drawer's work is done.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* The wide screen: the column, where it has always been. */}
      <div className="hidden h-screen w-64 flex-shrink-0 lg:block">
        {children}
      </div>

      {/* The small screen: the way in. */}
      <button
        type="button"
        aria-label="Open the menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-40 rounded-md border border-rail bg-surface p-2 text-text shadow-sm transition-colors hover:bg-surface-2 lg:hidden"
      >
        <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M2 4h12M2 8h12M2 12h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close the menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
