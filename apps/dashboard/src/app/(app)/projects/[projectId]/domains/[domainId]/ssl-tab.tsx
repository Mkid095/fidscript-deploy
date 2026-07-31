'use client';

import { useEffect, useState, useCallback } from 'react';
import type { DomainSslInfo } from '@fidscript-deploy/sdk';
import { Button, Card, Badge, Spinner, Toast } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';

interface Props {
  projectId: string;
  domainId: string;
}

export default function SslTab({ projectId, domainId }: Props) {
  const { getSdk } = useAuth();
  const [ssl, setSsl] = useState<DomainSslInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [renewingSsl, setRenewingSsl] = useState(false);
  const [reissuingSsl, setReissuingSsl] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const sslData = await sdk.domains.getSsl(projectId, domainId).catch(() => null);
      setSsl(sslData as DomainSslInfo | null);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  async function handleRenew() {
    setRenewingSsl(true);
    try {
      await getSdk().domains.renewSsl(projectId, domainId);
      setToast({ message: 'SSL renewal initiated — certificate will be updated shortly', type: 'success' });
      await load();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'SSL renewal failed', type: 'error' });
    } finally { setRenewingSsl(false); }
  }

  async function handleReissue() {
    setReissuingSsl(true);
    try {
      await getSdk().domains.reissueSsl(projectId, domainId);
      setToast({ message: 'SSL reissue initiated — new certificate will be issued shortly', type: 'success' });
      await load();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'SSL reissue failed', type: 'error' });
    } finally { setReissuingSsl(false); }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>;

  return (
    <div className="space-y-6">
      <Card className="border border-[var(--rail)]" padding="lg">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)] mb-1">SSL Certificate</h2>
            <p className="text-xs text-[var(--text-muted)]">
              {ssl?.method === 'letsencrypt' ? "Let's Encrypt" : ssl?.method ?? 'Unknown'} certificate
              {ssl?.autoRenew ? ' · Auto-renew enabled' : ''}
            </p>
          </div>
          <Badge variant={ssl?.status === 'ACTIVE' ? 'success' : ssl?.status === 'ISSUING' ? 'info' : 'danger'}>
            {ssl?.status ?? 'UNKNOWN'}
          </Badge>
        </div>

        {ssl ? (
          <dl className="space-y-3 text-sm mb-5">
            {[
              ['Issuer', ssl.method === 'letsencrypt' ? "Let's Encrypt" : ssl.method],
              ['Issued', ssl.issuedAt ? new Date(ssl.issuedAt).toLocaleDateString() : 'N/A'],
              ['Expires', ssl.expiresAt ? new Date(ssl.expiresAt).toLocaleDateString() : 'N/A'],
              ['Auto-Renew', ssl.autoRenew ? 'Enabled' : 'Disabled'],
              ['Last Checked', ssl.lastCheckedAt ? new Date(ssl.lastCheckedAt).toLocaleDateString() : 'N/A'],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4">
                <dt className="text-[var(--text-muted)] w-36 shrink-0">{label}</dt>
                <dd className="text-[var(--text)]">{value}</dd>
              </div>
            ))}
            {ssl.lastError && (
              <div className="rounded border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-2.5 text-xs text-[var(--danger)]">
                Error: {ssl.lastError}
              </div>
            )}
            {!ssl.enabled && (
              <div className="rounded border border-yellow-500/30 bg-yellow-500/10 p-2.5 text-xs text-yellow-400">
                SSL is disabled for this domain.
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-[var(--text-muted)] mb-5">No SSL data available.</p>
        )}

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" loading={renewingSsl} onClick={handleRenew} disabled={!ssl?.enabled || ssl?.status === 'ISSUING'}>
            Renew Certificate
          </Button>
          <Button variant="ghost" size="sm" loading={reissuingSsl} onClick={handleReissue} disabled={!ssl?.enabled || ssl?.status === 'ISSUING'}>
            Reissue Certificate
          </Button>
        </div>
      </Card>

      <Card className="border border-[var(--rail)]" padding="lg">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-3">SSL Health</h2>
        <div className="space-y-2.5 text-sm">
          {[
            { label: 'Certificate Status', ok: ssl?.status === 'ACTIVE', detail: ssl?.status ?? 'Unknown' },
            { label: 'Renewal Status', ok: ssl?.autoRenew, detail: ssl?.autoRenew ? 'Auto-renew enabled' : 'Auto-renew disabled' },
            {
              label: 'Expiry Warning',
              ok: ssl?.expiresAt && new Date(ssl.expiresAt) > new Date(Date.now() + 30 * 86400000),
              detail: ssl?.expiresAt
                ? new Date(ssl.expiresAt) <= new Date(Date.now() + 30 * 86400000)
                  ? `Expires in ${Math.ceil((new Date(ssl.expiresAt).getTime() - Date.now()) / 86400000)} days`
                  : 'OK (>30 days)'
                : 'N/A',
            },
          ].map(({ label, ok, detail }) => (
            <div key={label} className="flex items-center justify-between rounded border border-[var(--rail)] px-3 py-2">
              <span className="text-[var(--text-muted)]">{label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">{detail}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${ok ? 'bg-emerald-900 text-[var(--success)]' : 'bg-yellow-900 text-yellow-400'}`}>
                  {ok ? '✓' : '⚠'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
