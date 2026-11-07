import React, { useId } from 'react';

interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

/**
 * A switch — a setting that is on or off.
 *
 * It is a `role="switch"` button, so it announces its state, and it is
 * operated with the space bar as well as the mouse.
 */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  className = '',
  ...props
}: SwitchProps) {
  const generatedId = useId();
  const switchId = generatedId;
  const descriptionId = `${switchId}-description`;

  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <span id={switchId} className="block text-sm text-[var(--text)]">
          {label}
        </span>
        {description && (
          <p id={descriptionId} className="text-xs text-[var(--text-dim)] mt-0.5">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={switchId}
        {...(description ? { 'aria-describedby': descriptionId } : {})}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full
          transition-colors duration-200
          focus:outline-none focus-visible:shadow-[var(--focus-ring)]
          disabled:opacity-50 disabled:cursor-not-allowed
          ${checked ? 'bg-[var(--accent)]' : 'bg-[var(--rail)]'}
        `}
        {...props}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white shadow
            transition-transform duration-200
            ${checked ? 'translate-x-4' : 'translate-x-0.5'}
          `}
        />
      </button>
    </div>
  );
}
