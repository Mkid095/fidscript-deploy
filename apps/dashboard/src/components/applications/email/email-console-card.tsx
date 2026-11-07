'use client';

import { useState } from 'react';
import { Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, EyeIcon, EyeOffIcon, Link01Icon } from '@hugeicons/core-free-icons';

export interface MailConsoleConfiguration {
  consoleUrl: string;
  username: string;
  password: string;
  mailHost: string;
}

/**
 * The console, and the credential to log into it with.
 *
 * The operator installed the platform and was told where the mail console
 * is — and nothing else. The password is behind a deliberate click: it is
 * the credential to the whole mail server, and it should not sit on a
 * screen in a room with other people in it.
 */
export function EmailConsoleCard({ config }: { config: MailConsoleConfiguration | null }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState('');

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setCopied('');
    }
  }

  if (!config) {
    return (
      <div className="rounded-xl border border-[var(--rail)] bg-[var(--surface)] p-5">
        <p className="text-sm text-[var(--text-muted)]">The mail console is not available on this platform.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--rail)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">The console</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            The mail server&apos;s own administration console — every mailbox, alias and
            routing rule the server knows about.
          </p>
        </div>
        <a
          href={config.consoleUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--text)] text-xs font-medium hover:opacity-90 flex-shrink-0"
        >
          <HugeiconsIcon icon={Link01Icon} size={13} />
          Open the console
        </a>
      </div>

      <div className="space-y-2">
        <CredentialRow
          label="Console address"
          value={config.consoleUrl}
          copied={copied === 'Console address'}
          onCopy={() => copy('Console address', config.consoleUrl)}
        />
        <CredentialRow
          label="Username"
          value={config.username}
          copied={copied === 'Username'}
          onCopy={() => copy('Username', config.username)}
        />
        <CredentialRow
          label="Password"
          value={config.password}
          secret={!revealed}
          copied={copied === 'Password'}
          onCopy={() => copy('Password', config.password)}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRevealed(v => !v)}
              aria-label={revealed ? 'Hide the password' : 'Show the password'}
              className="p-1.5"
            >
              <HugeiconsIcon icon={revealed ? EyeOffIcon : EyeIcon} size={13} />
            </Button>
          }
        />
      </div>
    </div>
  );
}

interface CredentialRowProps {
  label: string;
  value: string;
  secret?: boolean;
  copied?: boolean;
  onCopy: () => void;
  action?: React.ReactNode;
}

function CredentialRow({ label, value, secret, copied, onCopy, action }: CredentialRowProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--text-muted)] w-28 flex-shrink-0">{label}</span>
      <code className="flex-1 min-w-0 truncate px-2.5 py-1.5 rounded bg-[var(--surface-2)] border border-[var(--rail)] text-xs font-mono text-[var(--text)]">
        {secret ? '••••••••••••••••' : value || '—'}
      </code>
      {action}
      <Button variant="ghost" size="sm" onClick={onCopy} className="p-1.5" aria-label={`Copy the ${label}`}>
        <HugeiconsIcon icon={Copy01Icon} size={13} className={copied ? 'text-[var(--success)]' : ''} />
      </Button>
    </div>
  );
}
