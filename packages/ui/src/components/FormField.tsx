import React, { useId } from 'react';

/**
 * The label, the control, and the message under it.
 *
 * A field is three things that belong together: a label that says what the
 * control is, the control itself, and a message that says what is wrong (or
 * what to expect). This component owns the wiring between them — the label's
 * `htmlFor`, the control's `id`, and the message's `aria-describedby` — so a
 * screen reader announces them together and a click on the label focuses
 * the control.
 *
 * The pattern it replaces: a `<label>` with no `htmlFor` next to an
 * `<input>` with no `id`, which is decorative text to a screen reader and a
 * dead label to a mouse.
 */
export interface FormFieldProps {
  /** The label. It is what the person reads and what the control is named. */
  label: React.ReactNode;
  /** The control. It receives the id and the described-by wiring. */
  children: (props: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }) => React.ReactNode;
  /** What is wrong. It is announced with the control. */
  error?: string;
  /** What to expect. It is announced with the control, and is hidden when there is an error. */
  hint?: string;
  /** Whether the field is required — it is announced as such. */
  required?: boolean;
  className?: string;
}

export function FormField({
  label,
  children,
  error,
  hint,
  required,
  className = '',
}: FormFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-xs font-medium text-[var(--text-muted)]">
        {label}
        {required && (
          <span className="text-[var(--danger)] ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children({
        id,
        ...(message ? { 'aria-describedby': messageId } : {}),
        ...(error ? { 'aria-invalid': true } : {}),
      })}
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
}
