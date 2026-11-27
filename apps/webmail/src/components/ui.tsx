'use client';

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react';
import { useId, useState } from 'react';

/**
 * The reusable component set — the platform console's kit, kept in sync with
 * `apps/console/src/components/ui/*`: the same names, the same classes, so
 * a screen here and a screen there read as the same product. Nothing here
 * carries business logic; a page composes these.
 */

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-hover border border-transparent',
  secondary: 'bg-surface-3 text-text hover:bg-rail border border-transparent',
  outline: 'bg-transparent text-text border border-rail hover:border-rail-light',
  ghost:
    'bg-transparent text-text-muted hover:text-text hover:bg-surface-2 border border-transparent',
  danger: 'bg-danger text-white hover:opacity-90 border border-transparent',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

/**
 * A button.
 *
 * It has a `type`, and the default is `button` — a "Cancel" that submits
 * the form it sits in is a bug that has been shipped before.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={rest.disabled || loading}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner className="mr-2" /> : null}
      {rest.children}
    </button>
  );
}

/** The primary button, named for the older call sites. */
export function PrimaryButton(props: ButtonProps) {
  return <Button {...props} variant="primary" />;
}

/** A button that is only an icon — it still needs a name. */
export function IconButton({
  label,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** The spinner. */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

/**
 * A panel.
 *
 * One border, one background, one padding — so every panel in the product
 * looks like every other panel. The optional head is the section's name and
 * its reason, the console's SectionHeader.
 */
export function Card({
  title,
  description,
  children,
  className = '',
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-rail bg-surface p-4 shadow-sm ${className}`}
      {...rest}
    >
      {title ? (
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-text-dim">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
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
          <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-text-dim">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/**
 * The top of a screen: what it is, what it is for, and what can be done
 * here. The title is the first thing on the screen and the actions are the
 * last thing on its line — so the eye goes from one to the other without
 * hunting.
 */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  compact = false,
  className = '',
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** A small line above the title — the level, or the state. */
  eyebrow?: ReactNode;
  /** The bar's own size — the title is smaller and the line is one line. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-x-6 gap-y-4 ${className}`}
    >
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1.5">{eyebrow}</div> : null}
        <h1
          className={`font-semibold tracking-tight text-text ${
            compact ? 'text-base' : 'text-xl'
          }`}
        >
          {title}
        </h1>
        {description ? (
          <p
            className={`mt-1 max-w-2xl leading-relaxed text-text-muted ${
              compact ? 'text-xs' : 'text-sm'
            }`}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/**
 * The frame a screen sits in: its bar, and its body.
 *
 * The bar is the screen's name and what can be done with it; the body is
 * capped by the frame's width. A screen that is not in this frame does not
 * look like the others — and that is the point.
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
  const max =
    width === 'wide' ? 'max-w-6xl' : width === 'narrow' ? 'max-w-3xl' : 'max-w-5xl';

  return (
    <>
      <div className="border-b border-rail">
        <div className="w-full px-4 py-4 sm:px-6 sm:py-4">
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
        className={`w-full ${max} space-y-8 px-4 py-6 sm:px-6 sm:py-8 ${className}`}
      >
        {children}
      </div>
    </>
  );
}

/** The frame, named for the older call sites. */
export function PageFrame({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Page title={title} description={description}>
      {children}
    </Page>
  );
}

/** A short status. The colour says what it means, and the word says it too. */
export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: 'border-rail text-text-muted',
    accent: 'border-accent/40 text-accent',
    success: 'border-success/40 text-success',
    warning: 'border-warning/40 text-warning',
    danger: 'border-danger/40 text-danger',
    info: 'border-info/40 text-info',
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * Nothing here.
 *
 * An empty state says what would be here and offers the way to put it here.
 * A blank panel says nothing at all.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-sm font-medium text-text">{title}</p>
      {body ? (
        <p className="max-w-sm text-xs leading-relaxed text-text-muted">
          {body}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/**
 * It could not be done, and this is why.
 *
 * An error is a state the screen shows, not an alert that interrupts it.
 */
export function ErrorState({
  title = 'That did not work',
  message,
  action,
}: {
  title?: string;
  message: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-3"
    >
      <p className="text-sm font-medium text-danger">{title}</p>
      <div className="mt-1 text-xs leading-relaxed text-text-muted">
        {message}
      </div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** The error, named for the older call sites: it is a state, shown whole. */
export function ErrorNote({ children }: { children: ReactNode }) {
  return <ErrorState message={children} />;
}

/**
 * The text field's shell, the console's: the control, the label above it,
 * the message under it, and the accent on the focus.
 */
export const FIELD_CLASS =
  'w-full rounded-md border border-rail bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-dim transition-colors focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-medium text-text-muted">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="block text-xs leading-relaxed text-text-dim">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return (
    <input
      className={`${FIELD_CLASS} ${className}`}
      {...rest}
    />
  );
}

/**
 * The password field, with its one honest affordance: a way to see what
 * was typed. The toggle is text, not an icon — it says what it will do.
 */
export function PasswordInput({
  label,
  hint,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  const [shown, setShown] = useState(false);
  const generated = useId();
  const inputId = rest.id ?? generated;

  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="block text-xs font-medium text-text-muted">
          {label}
        </span>
      ) : null}
      <div className="relative">
        <input
          id={inputId}
          type={shown ? 'text' : 'password'}
          className={`${FIELD_CLASS} pr-14 ${className}`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShown((current) => !current)}
          className="absolute inset-y-0 right-2 flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-text-dim transition-colors hover:text-text"
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint ? (
        <span className="block text-xs leading-relaxed text-text-dim">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/**
 * The segmented control.
 *
 * Two or three ways to do the one thing on the screen, chosen side by side.
 * The active segment carries the surface, so which one is on is never a
 * guess.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: {
  options: readonly { value: T; label: ReactNode }[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`grid auto-cols-fr grid-flow-col gap-1 rounded-lg border border-rail bg-surface-2 p-1 ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              active ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
