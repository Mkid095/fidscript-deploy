import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  hint?: string;
}

/**
 * An input.
 *
 * The label is connected to the control (`htmlFor` and an `id` that is
 * unique on the page — two fields with the same label used to share one
 * id), and the message under it is announced with the control.
 *
 * It forwards its ref, so a caller can focus it — for example from an
 * empty state's "Create" button.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className = '', id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`
          w-full h-10 rounded-md px-3 py-2 text-sm text-[var(--text)]
          bg-[var(--surface-2)] border border-[var(--rail)]
          placeholder:text-[var(--text-dim)]
          focus:outline-none focus:border-[var(--accent)] focus-visible:shadow-[var(--focus-ring)]
          transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-[var(--danger)]' : ''}
          ${className}
        `}
        {...(message ? { 'aria-describedby': messageId } : {})}
        {...(error ? { 'aria-invalid': true } : {})}
        {...props}
      />
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
