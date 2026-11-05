'use client';

import { useState } from 'react';
import { Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon } from '@hugeicons/core-free-icons';

export interface MailClientConfiguration {
  consoleUrl: string;
  username: string;
  password: string;
  mailHost: string;
  smtp: { host: string; port: number; secure: boolean; username: string; password: string };
  imap: { host: string; port: number; secure: boolean };
  submission: { host: string; port: number; secure: boolean; starttls: boolean; username: string; password: string };
}

/**
 * How to point a mail client at this server.
 *
 * The three ways to connect — implicit TLS, STARTTLS, and IMAP — with the
 * values filled in. An operator setting up an application that sends mail
 * should not have to work out which port is which.
 */
export function EmailClientCard({ config }: { config: MailClientConfiguration | null }) {
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

  if (!config) return null;

  const rows = [
    {
      label: 'SMTP (submission)',
      hint: 'Implicit TLS — the usual choice for sending',
      host: config.smtp.host,
      port: config.smtp.port,
      security: 'TLS',
      username: config.smtp.username,
    },
    {
      label: 'SMTP (STARTTLS)',
      hint: 'For a client that refuses port 465',
      host: config.submission.host,
      port: config.submission.port,
      security: 'STARTTLS',
      username: config.submission.username,
    },
    {
      label: 'IMAP',
      hint: 'For reading mail',
      host: config.imap.host,
      port: config.imap.port,
      security: 'TLS',
      username: '',
    },
  ];

  return (
    <div className="rounded-xl border border-[var(--rail)] bg-[var(--surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Your mail client</h2>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Every application that sends or reads mail on this platform connects here. The
        username is the mailbox&apos;s own address; the password is the one shown when the
        mailbox was created.
      </p>

      <div className="space-y-3">
        {rows.map(row => {
          const summary = `${row.host}:${row.port} · ${row.security}`;
          return (
            <div key={row.label} className="rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-3">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <p className="text-xs font-medium text-[var(--text)]">{row.label}</p>
                <button
                  type="button"
                  onClick={() => copy(row.label, summary)}
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                >
                  <HugeiconsIcon icon={Copy01Icon} size={11} className={copied === row.label ? 'text-[var(--success)]' : ''} />
                  {copied === row.label ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-dim)] mb-2">{row.hint}</p>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <Field label="Host" value={row.host} />
                <Field label="Port" value={String(row.port)} />
                <Field label="Security" value={row.security} />
                <Field label="Username" value={row.username || 'the mailbox address'} />
              </dl>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[var(--text-dim)] mt-3">
        The platform&apos;s own submission credential is <span className="font-mono">{config.username}</span> — it
        is what the platform uses for system mail, and it is shown on the console card above.
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">{label}</dt>
      <dd className="font-mono text-[var(--text-muted)] truncate mt-0.5">{value}</dd>
    </div>
  );
}
