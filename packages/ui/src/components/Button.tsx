import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent)] text-white shadow-[0_1px_2px_var(--shadow)] hover:opacity-90'
    + ' dark:bg-[var(--accent)] dark:text-white',
  secondary:
    'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--rail)] hover:bg-[var(--rail)]'
    + ' dark:bg-[var(--surface-2)] dark:text-[var(--text)] dark:border-[var(--rail)]',
  danger:
    'bg-[var(--danger)] text-white shadow-[0_1px_2px_var(--shadow)] hover:opacity-90',
  ghost:
    'bg-transparent text-[var(--text-muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]',
  outline:
    'bg-transparent text-[var(--text)] ring-1 ring-inset ring-[var(--rail)] hover:bg-[var(--hover)]'
    + ' dark:text-[var(--text)] dark:ring-[var(--rail)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2.5 text-xs',
  md: 'px-5 py-3 text-sm',
  lg: 'px-6 py-3.5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}