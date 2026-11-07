import type { HTMLAttributes, ReactNode } from 'react';

/**
 * A panel.
 *
 * One border, one background, one padding — so every panel in the product
 * looks like every other panel.
 */
export function Card({
  className = '',
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`rounded-lg border border-rail bg-surface ${className}`} {...rest}>
      {children}
    </div>
  );
}

/**
 * The top of a screen: what it is, what it is for, and what can be done
 * here.
 *
 * The title is the first thing on the screen and the actions are the last
 * thing on its line — so the eye goes from one to the other without
 * hunting. The description is capped at two lines' worth of reading, so a
 * long one cannot push the actions off the line.
 */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className = '',
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** A small line above the title — the level, or the state. */
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-x-6 gap-y-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1.5">{eyebrow}</div> : null}
        <h1 className="truncate text-xl font-semibold tracking-tight text-text">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** The top of a section inside a screen. */
export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-text">{title}</h2>
        {description ? (
          <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-text-dim">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
