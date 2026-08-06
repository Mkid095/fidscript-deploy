'use client';

import type { ActionType } from './job-form-types';
import { ACTION_OPTIONS } from './job-form-types';

interface ActionTypePickerProps {
  value: ActionType;
  onChange: (v: ActionType) => void;
  name?: string;
}

export function ActionTypePicker({ value, onChange, name = 'actionType' }: ActionTypePickerProps) {
  return (
    <div>
      <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Action type</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ACTION_OPTIONS.map(opt => (
          <label key={opt.value}
            className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
              value === opt.value
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text)]'
                : 'border-[var(--rail)] text-[var(--text-muted)] hover:border-[var(--accent)]/50'
            }`}>
            <input type="radio" name={name} value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="accent-[var(--accent)]" />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}