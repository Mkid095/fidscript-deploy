import type { ReactNode } from 'react';

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
export function Page({
  children,
  width = 'default',
  className = '',
}: {
  children: ReactNode;
  width?: 'default' | 'wide' | 'narrow';
  className?: string;
}) {
  const max =
    width === 'wide' ? 'max-w-6xl' : width === 'narrow' ? 'max-w-3xl' : 'max-w-5xl';

  return (
    <div className={`mx-auto w-full ${max} space-y-8 px-4 py-6 sm:px-6 sm:py-8 ${className}`}>
      {children}
    </div>
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
