'use client';

import { useState } from 'react';
import type { DomainIncident, DomainVerificationRun } from '@fidscript-deploy/sdk';
import { Button, Card, Spinner, Toast } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { useDomainRepairs } from '../domain-tab-hooks';
import { RepairsIncidents } from './repairs-incidents';
import { RepairsHistory } from './repairs-history';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props { projectId: string; domainId: string; }

// ── Action card ───────────────────────────────────────────────────────────────

function ActionCard({ title, description, loading, onClick }: {
  title: string;
  description: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Card className="border border-[var(--rail)]" padding="md">
      <h3 className="text-sm font-semibold text-[var(--text)] mb-1">{title}</h3>
      <p className="text-xs text-[var(--text-muted)] mb-4">{description}</p>
      <Button size="sm" variant="secondary" loading={loading} onClick={onClick}>
        Run
      </Button>
    </Card>
  );
}

// ── RepairsTab ────────────────────────────────────────────────────────────────

export default function RepairsTab({ projectId, domainId }: Props) {
  const { getSdk } = useAuth();
  const { incidents, history, loading, reload } = useDomainRepairs(projectId, domainId, getSdk);
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  async function handleHealthCheck() {
    setChecking(true);
    try {
      await getSdk().domains.triggerHealthCheck(projectId, domainId);
      setToast({ message: 'Health check triggered — results update shortly', type: 'success' });
      setTimeout(() => reload(), 5000);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Health check failed', type: 'error' });
    } finally { setChecking(false); }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await getSdk().domains.syncZone(projectId, domainId);
      setToast({ message: 'Zone sync complete', type: 'success' });
      await reload();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Sync failed — endpoint may not be available', type: 'error' });
    } finally { setSyncing(false); }
  }

  async function handleImport() {
    setImporting(true);
    try {
      await getSdk().domains.importZone(projectId, domainId);
      setToast({ message: 'Zone imported successfully', type: 'success' });
      await reload();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Import failed — endpoint may not be available', type: 'error' });
    } finally { setImporting(false); }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>;

  return (
    <div className="space-y-6">
      {/* Repair actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionCard title="Health Check" description="Re-run DNS, routing, SSL, and email checks." loading={checking} onClick={handleHealthCheck} />
        <ActionCard title="Sync Zone" description="Sync platform-managed records with your DNS provider." loading={syncing} onClick={handleSync} />
        <ActionCard title="Import Zone" description="Import existing records from your DNS provider." loading={importing} onClick={handleImport} />
      </div>
      {/* Incidents + history */}
      <RepairsIncidents incidents={incidents} />
      <RepairsHistory history={history} />
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
