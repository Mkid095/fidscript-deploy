import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  solid?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[var(--surface-2)] text-[var(--text-muted)] dark:bg-[var(--surface-3)]',
  accent: 'bg-[var(--accent-glow)] text-[var(--accent)]',
  success: 'bg-[var(--success)]/10 text-[var(--success)]',
  warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  danger: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  info: 'bg-[var(--info)]/10 text-[var(--info)]',
};

const solidVariantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[var(--surface-2)] text-[var(--text)]',
  accent: 'bg-[var(--accent)] text-white',
  success: 'bg-[var(--success)] text-white',
  warning: 'bg-[var(--warning)] text-white',
  danger: 'bg-[var(--danger)] text-white',
  info: 'bg-[var(--info)] text-white',
};

export function Badge({ children, variant = 'default', className = '', solid = false }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full
        text-xs font-medium capitalize
        ${solid ? solidVariantClasses[variant] : variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}