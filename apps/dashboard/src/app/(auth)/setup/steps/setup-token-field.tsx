'use client';

import { Input } from '@fidscript/ui';

interface SetupTokenFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

/**
 * The setup token.
 *
 * The installer prints it once, at the end of the install. The platform
 * refuses to configure itself without it — which is what stops an anonymous
 * visitor from configuring the platform and installing themselves as its
 * administrator.
 */
export function SetupTokenField({ value, onChange, error }: SetupTokenFieldProps) {
  return (
    <div className="mb-6">
      <Input
        label="Setup token"
        type="password"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Printed at the end of the install"
        autoComplete="off"
        spellCheck={false}
        error={error ?? undefined}
        hint="The installer prints it once, when the platform is installed."
      />
    </div>
  );
}
