import React, { useId } from 'react';

interface SearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  /** What is being searched. */
  placeholder?: string;
  onClear?: () => void;
}

/**
 * A search box.
 *
 * It is labelled — a placeholder is not a label, and a screen reader
 * announces the placeholder as the field's name when there is nothing else.
 */
export function SearchField({
  label = 'Search',
  placeholder,
  onClear,
  className = '',
  value,
  ...props
}: SearchFieldProps) {
  const generatedId = useId();
  const inputId = generatedId;

  return (
    <div className={`relative ${className}`}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        type="search"
        id={inputId}
        value={value}
        placeholder={placeholder ?? label}
        className={`
          w-full h-9 rounded-md pl-3 pr-8 text-sm text-[var(--text)]
          bg-[var(--surface-2)] border border-[var(--rail)]
          placeholder:text-[var(--text-dim)]
          focus:outline-none focus:border-[var(--accent)] focus-visible:shadow-[var(--focus-ring)]
          transition-colors duration-200
          [&::-webkit-search-cancel-button]:appearance-none
        `}
        {...props}
      />
      {onClear && String(value ?? '') !== '' && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear the search"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-[var(--text)] focus:outline-none focus-visible:shadow-[var(--focus-ring)] rounded"
        >
          ×
        </button>
      )}
    </div>
  );
}
