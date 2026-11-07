import type { ReactNode } from 'react';

import { PageHeader } from './card';

/**
 * The frame a screen sits in.
 *
 * One width, one rhythm, one way of being spaced. A screen that is not in
 * this frame does not look like the others — and that is the point: the
 * frame is what makes a set of screens read as one product.
 *
 * `wide` is for the platform level, where a screen may have a second
 * column beside it. The default is for the project level, where a screen is
 * one column and the eye should stay in it.
 */
function maxWidth(width: 'default' | 'wide' | 'narrow'): string {
  return width === 'wide'
    ? 'max-w-6xl'
    : width === 'narrow'
      ? 'max-w-3xl'
      : 'max-w-5xl';
}

/**
 * A screen: its bar, and its body.
 *
 * The bar is the screen's name and what can be done with it, and it stays
 * with the top of the screen while the body scrolls — so the way out of a
 * screen is always in the same place, whatever has been scrolled away.
 *
 * The bar is part of the frame rather than a thing each screen remembers
 * to add: a screen cannot have a body without a bar above it, and two
 * screens cannot disagree about what a bar looks like.
 */
export function Page({
  children,
  title,
  description,
  actions,
  eyebrow,
  width = 'default',
  className = '',
}: {
  children: ReactNode;
  /** The screen's name — the bar says what this is. */
  title: string;
  description?: string;
  /** What can be done with this screen — the bar carries the buttons. */
  actions?: ReactNode;
  /** A small line above the title — the level, or the state. */
  eyebrow?: ReactNode;
  width?: 'default' | 'wide' | 'narrow';
  className?: string;
}) {
  const max = maxWidth(width);

  return (
    <>
      <div className="sticky top-0 z-20 border-b border-rail bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        {/* The left padding makes room for the shell's menu button on a
            small screen; on a wide one the sidebar is back and it is not
            there. */}
        <div className={`mx-auto w-full ${max} py-3.5 pl-16 pr-4 lg:px-6`}>
          <PageHeader
            title={title}
            description={description}
            actions={actions}
            eyebrow={eyebrow}
            compact
          />
        </div>
      </div>

      <div
        className={`mx-auto w-full ${max} space-y-8 px-4 py-6 sm:px-6 sm:py-8 ${className}`}
      >
        {children}
      </div>
    </>
  );
}

/**
 * The two columns a wide screen may have.
 *
 * The first column is the work; the second is the context beside it. On a
 * narrow screen the context comes after the work, not beside it.
 */
export function PageColumns({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  if (!aside) {
    return <div className="space-y-8">{children}</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <div className="space-y-8">{children}</div>
      <aside className="space-y-6">{aside}</aside>
    </div>
  );
}
