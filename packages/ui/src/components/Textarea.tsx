import React, { useId } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  error?: string;
  hint?: string;
}

/**
 * A textarea.
 *
 * The same shape as the `Input` beside it, with the same wiring: the label
 * names the control, and the message under it is announced with it.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className = '', id, rows = 4, ...props },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const messageId = `${textareaId}-message`;
  const message = error ?? hint;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-medium text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={`
          w-full rounded-md px-3 py-2 text-sm text-[var(--text)] font-mono
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
