'use client';

import { Button } from '@fidscript/ui';

/**
 * The recovery codes, shown once.
 *
 * They are never readable again — the platform keeps only their hashes — so
 * this is the one chance to write them down.
 */
export function MfaRecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--text)]">
        Save these somewhere safe. Each one signs you in once if you lose your authenticator app.
        <strong className="text-[var(--text)]"> They are not shown again.</strong>
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-md border border-[var(--rail)] bg-[var(--surface-2)] p-3 font-mono text-xs text-[var(--text)]">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}
