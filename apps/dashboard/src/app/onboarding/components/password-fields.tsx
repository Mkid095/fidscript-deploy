'use client';

import { Badge } from '@fidscript/ui';
import { FormField, formInputClass } from './form-field';

interface PasswordFieldsProps {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  inlineError: string | null;
  setInlineError: (value: string | null) => void;
}

export function PasswordFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  inlineError,
  setInlineError,
}: PasswordFieldsProps) {
  const isMismatch = inlineError === 'Passwords do not match';

  return (
    <div className="space-y-4">
      <FormField
        label="Admin password"
        hint="Minimum 8 characters"
        error={inlineError && !password ? inlineError : null}
      >
        <input
          type="password"
          value={password}
          onChange={e => { onPasswordChange(e.target.value); setInlineError(null); }}
          placeholder="Min. 8 characters"
          className={formInputClass}
        />
      </FormField>
      <FormField
        label="Confirm password"
        error={password && isMismatch ? inlineError : null}
      >
        <input
          type="password"
          value={confirmPassword}
          onChange={e => { onConfirmChange(e.target.value); setInlineError(null); }}
          placeholder="Repeat password"
          className={formInputClass}
        />
      </FormField>
      {inlineError && !isMismatch && (
        <div className="rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 p-2.5 inline-block">
          <Badge variant="danger">{inlineError}</Badge>
        </div>
      )}
    </div>
  );
}
