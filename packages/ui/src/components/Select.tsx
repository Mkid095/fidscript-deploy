import React, { useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: React.ReactNode;
  error?: string;
  hint?: string;
  options: SelectOption[];
  /** A placeholder shown when nothing is selected. */
  placeholder?: string;
}

/**
 * A select.
 *
 * Thirty-seven of them were hand-rolled in the dashboard, each with its own
 * border, padding and focus behaviour. This one has the same shape as the
 * `Input` beside it, and it is labelled properly: the label is connected to
 * the control, and the message under it is announced with it.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, options, placeholder, className = '', id, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const messageId = `${selectId}-message`;
  const message = error ?? hint;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`
          w-full h-10 rounded-md px-3 py-2 text-sm text-[var(--text)]
          bg-[var(--surface-2)] border border-[var(--rail)]
          focus:outline-none focus:border-[var(--accent)] focus-visible:shadow-[var(--focus-ring)]
          transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-[var(--danger)]' : ''}
          ${className}
        `}
        {...(message ? { 'aria-describedby': messageId } : {})}
        {...(error ? { 'aria-invalid': true } : {})}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {message && (
        <p
          id={messageId}
          className={`text-xs ${error ? 'text-[var(--danger)]' : 'text-[var(--text-dim)]'}`}
        >
          {message}
        </p>
      )}
    </div>
  );
});
