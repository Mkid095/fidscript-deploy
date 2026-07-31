'use client';

import { useEffect, useState, useCallback } from 'react';
import type { DnsRecord } from '@fidscript-deploy/sdk';
import { Button, Card, Badge, Spinner, Toast } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';

interface Props {
  projectId: string;
  domainId: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={copy}
      className="text-xs px-2 py-1 rounded border border-[var(--rail)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-dim)] transition-colors"
    >
      {copied ? '✓' : 'Copy'}
    </button>
  );
}

export default function DnsTab({ projectId, domainId }: Props) {
  const { getSdk } = useAuth();
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoConfiguring, setAutoConfiguring] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const dnsData = await sdk.domains.getDnsRecords(projectId, domainId).catch(() => null);
      if (dnsData) {
        const d = dnsData as { records?: DnsRecord[] };
        setDnsRecords(d.records ?? []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  async function handleAutoConfigure() {
    setAutoConfiguring(true);
    try {
      await getSdk().domains.autoConfigureDnsRecords(projectId, domainId);
      setToast({ message: 'DNS records auto-configured via Cloudflare', type: 'success' });
      await load();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Auto-configure failed', type: 'error' });
    } finally {
      setAutoConfiguring(false);
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>;

  const categoryBadge: Record<string, string> = {
    deployment: 'bg-blue-900 text-blue-300',
    email: 'bg-purple-900 text-purple-300',
    verification: 'bg-yellow-900 text-yellow-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          Required DNS records for this domain. Records marked{' '}
          <span className="text-[var(--success)]">✓ OK</span> are confirmed propagating.
          <span className="text-[var(--danger)]"> ✗ Missing</span> need to be added at your DNS provider.
        </p>
        <Button variant="secondary" size="sm" loading={autoConfiguring} onClick={handleAutoConfigure}>
          Auto-configure
        </Button>
      </div>

      {dnsRecords.length === 0 ? (
        <Card className="border border-[var(--rail)]" padding="lg">
          <p className="text-sm text-[var(--text-muted)] text-center py-8">No DNS records available.</p>
        </Card>
      ) : (
        <div className="rounded-lg border border-[var(--rail)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--rail)] bg-[var(--surface-2)]">
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2.5">Type</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2.5">Name</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2.5">Value</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2.5 hidden lg:table-cell">TTL</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2.5 hidden md:table-cell">Category</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {dnsRecords.map((rec, i) => {
                const statusClass =
                  rec.status === 'ok' ? 'bg-emerald-900 text-[var(--success)]' :
                  rec.status === 'missing' ? 'bg-red-900 text-[var(--danger)]' :
                  'bg-[var(--rail)] text-[var(--text-muted)]';
                return (
                  <tr key={i} className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--surface-2)]/50">
                    <td className="px-4 py-3">
                      <Badge variant="default" className="font-mono">{rec.type}</Badge>
                      {rec.priority !== undefined && <span className="text-xs text-[var(--text-dim)] ml-1">{rec.priority}</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text)] max-w-[200px] truncate">{rec.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)] max-w-[280px] truncate"><span title={rec.value}>{rec.value}</span></td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] hidden lg:table-cell">{rec.ttl ?? 300}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${categoryBadge[rec.category] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
                        {rec.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusClass}`}>{rec.status}</span>
                    </td>
                    <td className="px-4 py-3"><CopyButton text={`${rec.type}  ${rec.name}  ${rec.value}`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
