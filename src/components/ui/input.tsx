'use client';

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

const FIELD_CLASS =
  'w-full rounded-md border border-rail bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-dim transition-colors focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

/**
 * A text field.
 *
 * The label names the control (`htmlFor` and a unique `id`), and the message
 * under it is announced **with** the control (`aria-describedby`). Two fields
 * with the same label get two different ids.
 */
export function Input({ label, hint, error, className = '', id, ...rest }: InputProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={inputId} className="block text-xs font-medium text-text-muted">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`${FIELD_CLASS} ${error ? 'border-danger' : ''} ${className}`}
        {...rest}
      />
      {message ? (
        <p id={messageId} className={`text-xs ${error ? 'text-danger' : 'text-text-dim'}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
}

/** A choice from a known list. */
export function Select({ label, hint, error, options, className = '', id, ...rest }: SelectProps) {
  const generated = useId();
  const selectId = id ?? generated;
  const messageId = `${selectId}-message`;
  const message = error ?? hint;

  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={selectId} className="block text-xs font-medium text-text-muted">
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`${FIELD_CLASS} ${error ? 'border-danger' : ''} ${className}`}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {message ? (
        <p id={messageId} className={`text-xs ${error ? 'text-danger' : 'text-text-dim'}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A field that is a choice between cards.
 *
 * The choice is named for a screen reader — the selected one says so, not
 * just the colour.
 */
export function ChoiceGroup({
  legend,
  name,
  value,
  onChange,
  options,
}: {
  legend: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; title: string; body: string }[];
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-xs font-medium text-text-muted">{legend}</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer flex-col rounded-lg border p-3 transition-colors ${
                selected
                  ? 'border-accent bg-accent/10'
                  : 'border-rail bg-surface-2 hover:border-rail-light'
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={selected}
                  onChange={() => onChange(option.value)}
                  className="size-3.5 accent-[var(--accent)]"
                />
                <span className="text-sm font-medium text-text">{option.title}</span>
              </span>
              <span className="mt-1.5 text-xs leading-relaxed text-text-muted">{option.body}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** A read-only value, shown the way a definition list shows it. */
export function DefinitionRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-xs text-text-dim">{term}</dt>
      <dd className="truncate text-sm text-text">{children}</dd>
    </div>
  );
}
