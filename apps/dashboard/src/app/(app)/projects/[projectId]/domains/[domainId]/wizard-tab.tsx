'use client';

import { useEffect, useState, useCallback } from 'react';
import type { DomainHealth, DnsRecord } from '@fidscript-deploy/sdk';
import { Button, Card, Spinner, Toast, Badge, Stepper } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  domainId: string;
}

// ── Wizard stages ─────────────────────────────────────────────────────────────

type Stage = 'records' | 'verify' | 'active' | 'error';

const STAGES = [
  { label: 'Records', hint: 'Configure DNS' },
  { label: 'Verify', hint: 'Propagation check' },
  { label: 'Active', hint: 'Domain live' },
];

function stageIndex(stage: Stage): number {
  return stage === 'records' ? 0 : stage === 'verify' ? 1 : stage === 'active' ? 2 : 0;
}

// ── Record row ────────────────────────────────────────────────────────────────

function RecordRow({ rec }: { rec: DnsRecord }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(`${rec.type}\t${rec.name}\t${rec.value}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  const statusClass =
    rec.status === 'ok' ? 'bg-emerald-900/60 text-emerald-300' :
    rec.status === 'missing' ? 'bg-red-900/60 text-red-300' :
    'bg-[var(--rail)] text-[var(--text-muted)]';
  return (
    <tr className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--surface-2)]/50">
      <td className="px-4 py-3"><Badge variant="default" className="font-mono">{rec.type}</Badge></td>
      <td className="px-4 py-3 font-mono text-xs text-[var(--text)] max-w-[160px] truncate" title={rec.name}>{rec.name}</td>
      <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)] max-w-[240px] truncate" title={rec.value}>{rec.value}</td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}>{rec.status}</span>
      </td>
      <td className="px-4 py-3">
        <button onClick={copy}
          className="text-xs px-2 py-1 rounded border border-[var(--rail)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-dim)] transition-colors">
          {copied ? '✓' : 'Copy'}
        </button>
      </td>
    </tr>
  );
}

// ── Records stage ──────────────────────────────────────────────────────────────

function RecordsStage({ records, onProceed }: { records: DnsRecord[]; onProceed: () => void }) {
  const categories = ['deployment', 'email', 'verification'] as const;
  const allOk = records.length > 0 && records.every(r => r.status === 'ok');
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          Add these records at your DNS provider, then come back to verify propagation.
          {allOk && ' All records look configured — you can proceed to verify.'}
        </p>
        {allOk && <Button size="sm" onClick={onProceed}>Proceed to Verify</Button>}
      </div>
      {categories.map(cat => {
        const catRecords = records.filter(r => r.category === cat);
        if (!catRecords.length) return null;
        return (
          <div key={cat}>
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 px-1">{cat} records</h3>
            <div className="rounded-lg border border-[var(--rail)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--rail)] bg-[var(--surface-2)]">
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2">Type</th>
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2">Name</th>
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2">Value</th>
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2 hidden md:table-cell">Status</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {catRecords.map((rec, i) => <RecordRow key={i} rec={rec} />)}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Verify stage ──────────────────────────────────────────────────────────────

function VerifyStage({ projectId, domainId, getSdk }: { projectId: string; domainId: string; getSdk: () => ReturnType<ReturnType<typeof useAuth>['getSdk']> }) {
  const [verifying, setVerifying] = useState(false);
  const [health, setHealth] = useState<DomainHealth | null>(null);
  const [polling, setPolling] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  async function handleVerify() {
    setVerifying(true);
    try {
      await getSdk().domains.verify(domainId);
      setToast({ message: 'Verification started — checking DNS propagation…', type: 'success' });
      startPoll();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Verification failed', type: 'error' });
      setVerifying(false);
    }
  }

  function startPoll() {
    setPolling(true);
    let attempts = 0;
    const poll = async () => {
      if (attempts >= 20) { setPolling(false); return; }
      attempts++;
      try {
        const h = await getSdk().domains.getHealth(projectId, domainId) as DomainHealth | null;
        if (h && h.status !== 'degraded' && h.status !== null) { setHealth(h); setPolling(false); return; }
      } catch { /* continue polling */ }
      setTimeout(poll, 3000);
    };
    setTimeout(poll, 3000);
  }

  useEffect(() => { handleVerify(); }, []);

  const score = health?.score ?? 0;
  const scoreColor = score >= 90 ? 'text-[var(--success)]' : score >= 60 ? 'text-yellow-400' : 'text-[var(--danger)]';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="sm" loading={verifying || polling} onClick={handleVerify}>
          {verifying ? 'Verifying…' : polling ? 'Checking…' : 'Verify DNS'}
        </Button>
        {polling && <span className="text-sm text-[var(--text-muted)]">Waiting for propagation…</span>}
      </div>
      {health && (
        <Card className="border border-[var(--rail)]" padding="md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--text)]">Health Score</span>
            <span className={`text-2xl font-bold ${scoreColor}`}>{health.score}<span className="text-sm text-[var(--text-muted)]">/100</span></span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'DNS', ok: health.dnsOk },
              { label: 'Routing', ok: health.routingOk },
              { label: 'SSL', ok: health.sslOk },
              { label: 'Email', ok: health.emailOk },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center justify-between rounded border border-[var(--rail)] px-3 py-2">
                <span className="text-[var(--text-muted)]">{label}</span>
                <span className={`text-sm ${ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{ok ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
          {health.errorMessage && (
            <div className="mt-3 rounded border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 text-xs text-[var(--danger)]">
              {health.errorMessage}
            </div>
          )}
        </Card>
      )}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── Main WizardTab ────────────────────────────────────────────────────────────

export default function WizardTab({ projectId, domainId }: Props) {
  const { getSdk } = useAuth();
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [health, setHealth] = useState<DomainHealth | null>(null);
  const [loading, setLoading] = useState(true);

  // TODO (backend): GET /api/v1/projects/:projectId/domains/wizard/:domainId
  // returns DomainWizardStatus with stage + progress fields. Wire once DOM-W01 exists.
  const [stage, setStage] = useState<Stage>('records');

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const [dnsData, healthData] = await Promise.all([
        sdk.domains.getDnsRecords(projectId, domainId).catch(() => null),
        sdk.domains.getHealth(projectId, domainId).catch(() => null),
      ]);
      if (dnsData) {
        const d = dnsData as { records?: DnsRecord[] };
        setRecords(d.records ?? []);
      }
      if (healthData) setHealth(healthData as DomainHealth);
      // Derive stage from health — all checks pass → active, any fail → error
      if (healthData) {
        const h = healthData as DomainHealth;
        if (h.dnsOk && h.routingOk && h.sslOk) setStage('active');
        else if (h.dnsOk || h.routingOk || h.sslOk) setStage('verify');
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <Stepper steps={STAGES} current={stageIndex(stage)} className="mb-2" />

      {stage === 'records' && (
        <RecordsStage records={records} onProceed={() => setStage('verify')} />
      )}
      {stage === 'verify' && (
        <VerifyStage projectId={projectId} domainId={domainId} getSdk={getSdk} />
      )}
      {stage === 'active' && (
        <Card className="border border-[var(--success)]/40" padding="lg">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl text-[var(--success)]">✓</span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Domain Active</h2>
              <p className="text-xs text-[var(--text-muted)]">All DNS checks passing. Your domain is fully configured.</p>
            </div>
          </div>
          {health && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-4">
              {[
                ['DNS', health.dnsOk ? '✓' : '✗'],
                ['Routing', health.routingOk ? '✓' : '✗'],
                ['SSL', health.sslOk ? '✓' : '✗'],
                ['Email', health.emailOk ? '✓' : '✗'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-[var(--text-muted)]">{label}</dt>
                  <dd className={value === '✓' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="flex gap-3 mt-5">
            <Button size="sm" variant="secondary" onClick={() => setStage('verify')}>Re-verify</Button>
            <Button size="sm" variant="secondary" onClick={() => setStage('records')}>View Records</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
