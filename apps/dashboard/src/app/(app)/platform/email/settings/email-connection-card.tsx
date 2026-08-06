'use client';

import { useEffect, useState } from 'react';
import { Card } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon, ShieldKeyIcon, Loading03Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import type { FidscriptSDK, MailConnectionInfo } from '@fidscript-deploy/sdk';

interface Props { sdk: FidscriptSDK; }

export function EmailConnectionCard({ sdk }: Props) {
  const [info, setInfo] = useState<MailConnectionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await sdk.email.connection.get();
        if (!cancelled) setInfo(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load connection info');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sdk]);

  return (
    <Card className="border border-[var(--rail)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <HugeiconsIcon icon={Mail01Icon} size={16} strokeWidth={1.5} className="text-[var(--text-muted)]" />
        <h2 className="text-sm font-semibold text-[var(--text)]">Connection Details</h2>
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Use these settings to configure a mail client (Thunderbird, Apple Mail, Outlook) against the
        self-hosted Stalwart server. Each mailbox uses its full email address as the username.
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <HugeiconsIcon icon={Loading03Icon} size={14} strokeWidth={1.5} className="animate-spin" />
          Loading connection info...
        </div>
      )}
      {error && (
        <p className="text-xs text-[var(--danger)]">Failed to load: {error}</p>
      )}

      {info && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailRow label="Hostname" value={info.hostname} />
          <DetailRow label="Auth Method" value={info.authMethod} icon={ShieldKeyIcon} />
          <DetailRow label="IMAP Host" value={info.imap.host} />
          <DetailRow label="IMAP Port" value={String(info.imap.port)} sub={info.imap.tls ? 'TLS' : 'STARTTLS'} />
          <DetailRow label="SMTP Host" value={info.smtp.host} />
          <DetailRow label="SMTP Submission Port" value={String(info.smtp.submissionPort)} sub="STARTTLS" />
          {info.smtp.secure && (
            <DetailRow label="SMTP Implicit TLS" value={`${info.smtp.host}:${info.smtp.port}`} sub="port 465" />
          )}
          <DetailRow label="Username Format" value={info.usernameFormat} />
          <DetailRow label="TLS Version" value={info.tlsVersion} />
        </div>
      )}
    </Card>
  );
}

function DetailRow({ label, value, sub, icon: Icon }: {
  label: string; value: string; sub?: string; icon?: IconSvgElement;
}) {
  return (
    <div className="border border-[var(--rail)] rounded-md px-3 py-2 bg-[var(--surface-2)]">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1 flex items-center gap-1">
        {Icon && <HugeiconsIcon icon={Icon} size={11} strokeWidth={1.5} />}
        {label}
      </p>
      <p className="text-sm font-mono text-[var(--text)] break-all">{value}</p>
      {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}
