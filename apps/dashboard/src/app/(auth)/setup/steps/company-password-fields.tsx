'use client';

import { Input } from '@fidscript/ui';

interface CompanyPasswordFieldsProps {
  setupPassword: string;
  confirmSetupPassword: string;
  onSetupPasswordChange: (v: string) => void;
  onConfirmSetupPasswordChange: (v: string) => void;
}

/**
 * The company password — set here, by the person running the platform.
 *
 * It is what a new account has to present at sign-up, so it is the operator's
 * own secret: it is stored as a bcrypt hash on the platform, never in the
 * clear, and it is never shown again after the setup.
 */
export function CompanyPasswordFields({
  setupPassword,
  confirmSetupPassword,
  onSetupPasswordChange,
  onConfirmSetupPasswordChange,
}: CompanyPasswordFieldsProps) {
  return (
    <>
      <Input
        label="Company password"
        type="password"
        value={setupPassword}
        onChange={e => onSetupPasswordChange(e.target.value)}
        placeholder="People will present this to create an account"
        required
        minLength={8}
        autoComplete="off"
        className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
      />
      <Input
        label="Confirm company password"
        type="password"
        value={confirmSetupPassword}
        onChange={e => onConfirmSetupPasswordChange(e.target.value)}
        placeholder="Repeat the company password"
        required
        minLength={8}
        autoComplete="off"
        className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
      />
      <p className="text-xs text-[var(--text-muted)] -mt-2">
        New accounts must present this password to sign up. Share it with your
        team — it is never displayed again.
      </p>
    </>
  );
}
