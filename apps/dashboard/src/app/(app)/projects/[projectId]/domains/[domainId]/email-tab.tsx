'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { Domain, DnsRecord } from '@fidscript-deploy/sdk';
import { Button, Card, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';

interface Props {
  projectId: string;
  domainId: string;
}

export default function EmailTab({ projectId, domainId }: Props) {
  const { getSdk } = useAuth();
  const [domain, setDomain] = useState<Domain | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const [domainData, dnsData] = await Promise.all([
        sdk.domains.get(domainId).catch(() => null),
        sdk.domains.getDnsRecords(projectId, domainId).catch(() => null),
      ]);
      if (domainData) setDomain(domainData as Domain);
      if (dnsData) {
        const d = dnsData as { records?: DnsRecord[] };
        setDnsRecords(d.records ?? []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>;
  if (!domain) return null;

  return (
    <div className="space-y-6">
      <Card className="border border-[var(--rail)]" padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text)]">Email Configuration</h2>
          <Link href={`/projects/${projectId}/email`}>
            <Button variant="ghost" size="sm">Manage Email</Button>
          </Link>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          To enable sending and receiving email for{' '}
          <strong className="text-[var(--text)]">{domain.domain}</strong>,
          configure the email DNS records in the DNS Records tab above.
        </p>
        <div className="space-y-2.5 text-sm">
          {[
            { label: 'MX Records', hint: 'Routes incoming mail to the mail server', done: dnsRecords.some(r => r.type === 'MX' && r.status === 'ok') },
            { label: 'SPF Record', hint: 'Authorizes sending servers', done: dnsRecords.some(r => r.type === 'TXT' && r.name === '@' && r.value.includes('spf1') && r.status === 'ok') },
            { label: 'DKIM Record', hint: 'Email cryptographic signature', done: dnsRecords.some(r => r.type === 'TXT' && r.name.includes('_domainkey') && r.status === 'ok') },
            { label: 'DMARC Record', hint: 'Policy for unauthenticated mail', done: dnsRecords.some(r => r.type === 'TXT' && r.name === '_dmarc' && r.status === 'ok') },
          ].map(({ label, hint, done }) => (
            <div key={label} className="flex items-center justify-between rounded border border-[var(--rail)] px-3 py-2.5">
              <div>
                <p className="text-[var(--text)] text-sm font-medium">{label}</p>
                <p className="text-xs text-[var(--text-muted)]">{hint}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${done ? 'bg-emerald-900 text-[var(--success)]' : 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
                {done ? '✓ Configured' : '✗ Not configured'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border border-[var(--rail)]" padding="lg">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Deliverability Insights</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Reputation', value: '—', sub: 'Not enough data' },
            { label: 'Bounce Rate', value: '—', sub: 'No sends yet' },
            { label: 'Complaint Rate', value: '—', sub: 'No sends yet' },
            { label: 'Inbox Placement', value: '—', sub: 'No sends yet' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold text-[var(--text)]">{value}</p>
              <p className="text-xs font-medium text-[var(--text-muted)] mt-0.5">{label}</p>
              <p className="text-xs text-[var(--text-dim)]">{sub}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-dim)] mt-4">
          Deliverability insights are populated after sending emails through this domain.
          Configure email DNS records above to start sending.
        </p>
      </Card>
    </div>
  );
}
