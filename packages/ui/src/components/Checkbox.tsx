import React, { useId } from 'react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
  /** The message under the label — what the box means. */
  description?: string;
}

/**
 * A checkbox with its label.
 *
 * The label is part of the control: clicking it toggles the box, and a
 * screen reader announces them as one thing.
 */
export function Checkbox({ label, description, className = '', id, ...props }: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  const descriptionId = `${checkboxId}-description`;

  return (
    <div className={`flex items-start gap-2.5 ${className}`}>
      <input
        type="checkbox"
        id={checkboxId}
        className={`
          mt-0.5 h-4 w-4 rounded border-[var(--rail)] bg-[var(--surface-2)]
          accent-[var(--accent)]
          focus:outline-none focus-visible:shadow-[var(--focus-ring)]
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        {...(description ? { 'aria-describedby': descriptionId } : {})}
        {...props}
      />
      <div className="min-w-0">
        <label htmlFor={checkboxId} className="block text-sm text-[var(--text)] cursor-pointer">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-xs text-[var(--text-dim)] mt-0.5">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
