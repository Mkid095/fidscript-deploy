import React, { useId, useState } from 'react';

interface TooltipProps {
  /** The tooltip's text. */
  label: string;
  children: React.ReactNode;
  /** Where it sits relative to the control. */
  placement?: 'top' | 'bottom';
  className?: string;
}

/**
 * A hint.
 *
 * The text is in the DOM and connected with `aria-describedby`, so it is
 * announced with the control — a tooltip that only appears on hover is
 * invisible to a keyboard and to a screen reader.
 */
export function Tooltip({ label, children, placement = 'top', className = '' }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  const position =
    placement === 'top'
      ? 'bottom-full left-1/2 -translate-x-1/2 mb-1.5'
      : 'top-full left-1/2 -translate-x-1/2 mt-1.5';

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`
            absolute z-[var(--z-dropdown)] whitespace-nowrap rounded-md px-2 py-1
            text-[10px] text-[var(--text)] bg-[var(--surface-3)] border border-[var(--rail)]
            shadow-[var(--elevation-md)] pointer-events-none
            ${position}
          `}
        >
          {label}
        </span>
      )}
    </span>
  );
}
