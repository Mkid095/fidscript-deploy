import React, { useEffect, useRef, useState } from 'react';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /** The item is destructive — it is drawn in the danger colour. */
  danger?: boolean;
}

interface DropdownMenuProps {
  /** The control that opens the menu. */
  trigger: React.ReactNode;
  items: DropdownItem[];
  /** The menu's name — announced when it opens. */
  label: string;
  align?: 'left' | 'right';
  className?: string;
}

/**
 * A menu.
 *
 * It closes on Escape and on a click outside, it takes the keyboard
 * (arrows move, Enter chooses, Escape leaves), and it says what it is.
 */
export function DropdownMenu({
  trigger,
  items,
  label,
  align = 'right',
  className = '',
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onClickAway);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickAway);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function move(step: number) {
    setActive((index) => {
      let next = index;
      for (let i = 0; i < items.length; i++) {
        next = (next + step + items.length) % items.length;
        if (!items[next].disabled) return next;
      }
      return index;
    });
  }

  return (
    <div ref={containerRef} className={`relative inline-flex ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="inline-flex items-center rounded-md focus:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        {trigger}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className={`
            absolute z-[var(--z-dropdown)] mt-1 min-w-44 rounded-md py-1
            bg-[var(--surface)] border border-[var(--rail)] shadow-[var(--elevation-md)]
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              move(1);
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              move(-1);
            }
          }}
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              role="menuitem"
              disabled={item.disabled}
              tabIndex={index === active ? 0 : -1}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`
                w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs
                transition-colors duration-150
                focus:outline-none focus-visible:bg-[var(--hover)]
                disabled:opacity-50 disabled:cursor-not-allowed
                ${item.danger ? 'text-[var(--danger)]' : 'text-[var(--text)]'}
              `}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
