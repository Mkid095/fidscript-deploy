'use client';

import { useEffect, useState } from 'react';
import type { DomainHealth } from '@fidscript-deploy/sdk';
import { Card, Spinner, Stepper } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { useDomainWizard } from '../domain-tab-hooks';
import { useDomainWizardPoll } from './use-domain-wizard-poll';
import { WizardRecordsStage } from './wizard-records-stage';
import { WizardVerifyStage } from './wizard-verify-stage';

// ── Props & stages ─────────────────────────────────────────────────────────────

interface Props { projectId: string; domainId: string; }

type Stage = 'records' | 'verify' | 'active';

const STAGES = [
  { label: 'Records', hint: 'Configure DNS' },
  { label: 'Verify', hint: 'Propagation check' },
  { label: 'Active', hint: 'Domain live' },
];

function stageIndex(s: Stage): number {
  return s === 'records' ? 0 : s === 'verify' ? 1 : 2;
}

// ── Active stage ───────────────────────────────────────────────────────────────

function ActiveStage({ health, onVerify, onRecords }: {
  health: DomainHealth | null;
  onVerify: () => void;
  onRecords: () => void;
}) {
  return (
    <Card className="border border-[var(--success)]/40" padding="lg">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl text-[var(--success)]">&#x2713;</span>
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Domain Active</h2>
          <p className="text-xs text-[var(--text-muted)]">All DNS checks passing.</p>
        </div>
      </div>
      {health && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-4">
          {([
            ['DNS', health.dnsOk] as [string, boolean],
            ['Routing', health.routingOk] as [string, boolean],
            ['SSL', health.sslOk] as [string, boolean],
            ['Email', health.emailOk] as [string, boolean],
          ]).map(([label, ok]) => (
            <div key={label} className="flex justify-between">
              <dt className="text-[var(--text-muted)]">{label}</dt>
              <dd className={ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>{ok ? '✓' : '✗'}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="flex gap-3 mt-5">
        <button onClick={onVerify}
          className="text-xs px-3 py-1.5 rounded border border-[var(--rail)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-dim)] transition-colors">
          Re-verify
        </button>
        <button onClick={onRecords}
          className="text-xs px-3 py-1.5 rounded border border-[var(--rail)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-dim)] transition-colors">
          View Records
        </button>
      </div>
    </Card>
  );
}

// ── WizardTab ──────────────────────────────────────────────────────────────────

export default function WizardTab({ projectId, domainId }: Props) {
  const { getSdk } = useAuth();
  const { records, health, loading } = useDomainWizard(projectId, domainId, getSdk);

  // TODO (backend): GET /api/v1/projects/:projectId/domains/wizard/:domainId
  // returns DomainWizardStatus with stage + progress fields. Wire once DOM-W01 exists.
  const [stage, setStage] = useState<Stage>(() => {
    if (!health) return 'records';
    if (health.dnsOk && health.routingOk && health.sslOk) return 'active';
    if (health.dnsOk || health.routingOk || health.sslOk) return 'verify';
    return 'records';
  });

  // Auto-poll the domain record while we're on the records stage. The server
  // returns the new domain in PENDING state until DNS propagates — once it
  // flips to ACTIVE the user shouldn't have to click anything to advance.
  const poll = useDomainWizardPoll({
    active: stage === 'records',
    domainId,
    getSdk,
  });

  useEffect(() => {
    if (stage === 'records' && poll.reachedActive) setStage('verify');
  }, [stage, poll.reachedActive]);

  if (loading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>;

  return (
    <div className="space-y-6">
      <Stepper steps={STAGES} current={stageIndex(stage)} className="mb-2" />
      {stage === 'records' && (
        <WizardRecordsStage
          records={records}
          autoPolling={poll.polling}
          autoPollError={poll.error}
          onProceed={() => setStage('verify')}
        />
      )}
      {stage === 'verify' && (
        <WizardVerifyStage projectId={projectId} domainId={domainId} getSdk={getSdk} />
      )}
      {stage === 'active' && (
        <ActiveStage health={health} onVerify={() => setStage('verify')} onRecords={() => setStage('records')} />
      )}
    </div>
  );
}