import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** What the button does. It is the button's only name. */
  label: string;
  children: React.ReactNode;
  variant?: 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md';
}

/**
 * A button that is only an icon.
 *
 * It always has a name — an icon with no label is a mystery to a screen
 * reader and to anybody who cannot see it.
 */
export function IconButton({
  label,
  children,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}: IconButtonProps) {
  const variants = {
    ghost: 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]',
    outline: 'text-[var(--text-muted)] border border-[var(--rail)] hover:bg-[var(--hover)] hover:text-[var(--text)]',
    danger: 'text-[var(--danger)] hover:bg-[var(--danger)]/10',
  };
  const sizes = { sm: 'h-7 w-7', md: 'h-8 w-8' };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`
        inline-flex items-center justify-center rounded-md
        transition-colors duration-150
        focus:outline-none focus-visible:shadow-[var(--focus-ring)]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
