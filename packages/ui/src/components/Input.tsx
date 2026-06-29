import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  error,
  hint,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full h-11 rounded-lg px-4 py-2.5 text-sm text-[var(--text)]
          bg-[var(--surface-2)] border border-[var(--rail)]
          placeholder:text-[var(--text-dim)]
          focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)]
          transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      {hint && !error && <p className="text-xs text-[var(--text-dim)]">{hint}</p>}
    </div>
  );
}