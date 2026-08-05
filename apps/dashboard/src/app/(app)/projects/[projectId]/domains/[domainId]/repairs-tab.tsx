'use client';

import { useEffect, useState, useCallback } from 'react';
import type { DomainIncident, DomainVerificationRun } from '@fidscript-deploy/sdk';
import { Button, Card, Spinner, Toast, Badge } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  domainId: string;
}

// ── Incident card ─────────────────────────────────────────────────────────────

function IncidentCard({ incident }: { incident: DomainIncident }) {
  const severityColor = incident.severity === 'critical' ? 'border-[var(--danger)]/40 bg-red-950/20'
    : incident.severity === 'warning' ? 'border-yellow-500/40 bg-yellow-950/20'
    : 'border-[var(--rail)] bg-[var(--surface)]';
  return (
    <div className={`rounded-lg border p-4 ${severityColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--text)]">{incident.title}</p>
          {incident.description && (
            <p className="text-xs text-[var(--text-muted)] mt-1">{incident.description}</p>
          )}
          <p className="text-xs text-[var(--text-dim)] mt-1.5">
            Opened {new Date(incident.openedAt).toLocaleString()}
          </p>
        </div>
        <Badge variant={incident.severity === 'critical' ? 'danger' : incident.severity === 'warning' ? 'info' : 'default'}>
          {incident.severity}
        </Badge>
      </div>
    </div>
  );
}

// ── Verification history row ──────────────────────────────────────────────────

function HistoryRow({ run }: { run: DomainVerificationRun }) {
  const improved = run.newStatus === 'HEALTHY' || run.newStatus === 'DEGRADED';
  const degraded = run.newStatus === 'FAILED' || run.previousStatus === 'HEALTHY' && run.newStatus === 'DEGRADED';
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--rail)] last:border-0">
      <div className="flex items-center gap-3">
        <span className={`text-lg ${improved ? 'text-[var(--success)]' : degraded ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
          {improved ? '↑' : degraded ? '↓' : '→'}
        </span>
        <div>
          <p className="text-sm text-[var(--text)] capitalize">{run.reason.replace(/_/g, ' ')}</p>
          <p className="text-xs text-[var(--text-dim)]">{new Date(run.createdAt).toLocaleString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        {run.previousScore !== null && (
          <span>{run.previousScore} → </span>
        )}
        <span className={run.newScore !== null && run.newScore >= 80 ? 'text-[var(--success)]' : run.newScore !== null && run.newScore < 60 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}>
          {run.newScore ?? '—'}
        </span>
      </div>
    </div>
  );
}

// ── Main RepairsTab ───────────────────────────────────────────────────────────

export default function RepairsTab({ projectId, domainId }: Props) {
  const { getSdk } = useAuth();
  const [incidents, setIncidents] = useState<DomainIncident[]>([]);
  const [history, setHistory] = useState<DomainVerificationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const [incidentData, historyData] = await Promise.all([
        sdk.domains.getIncidents(projectId, domainId).catch(() => null),
        sdk.domains.getHistory(projectId, domainId).catch(() => null),
      ]);
      if (incidentData) setIncidents(incidentData as DomainIncident[]);
      if (historyData) setHistory(historyData as DomainVerificationRun[]);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  async function handleHealthCheck() {
    setChecking(true);
    try {
      await getSdk().domains.triggerHealthCheck(projectId, domainId);
      setToast({ message: 'Health check triggered — results will update shortly', type: 'success' });
      setTimeout(() => load(), 5000);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Health check failed', type: 'error' });
    } finally { setChecking(false); }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      // TODO (backend): POST /api/v1/projects/:projectId/domains/:domainId/sync-zone
      // SDK has syncZone() but endpoint may not be wired yet.
      await getSdk().domains.syncZone(projectId, domainId);
      setToast({ message: 'Zone sync complete', type: 'success' });
      await load();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Sync failed — endpoint may not be available', type: 'error' });
    } finally { setSyncing(false); }
  }

  async function handleImport() {
    setImporting(true);
    try {
      // TODO (backend): POST /api/v1/projects/:projectId/domains/:domainId/import-zone
      await getSdk().domains.importZone(projectId, domainId);
      setToast({ message: 'Zone imported successfully', type: 'success' });
      await load();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Import failed — endpoint may not be available', type: 'error' });
    } finally { setImporting(false); }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>;

  const openIncidents = incidents.filter(i => i.status === 'open');

  return (
    <div className="space-y-6">
      {/* Repair actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-[var(--rail)]" padding="md">
          <h3 className="text-sm font-semibold text-[var(--text)] mb-1">Health Check</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">Re-run DNS, routing, SSL, and email checks.</p>
          <Button size="sm" variant="secondary" loading={checking} onClick={handleHealthCheck}>
            Run Health Check
          </Button>
        </Card>
        <Card className="border border-[var(--rail)]" padding="md">
          <h3 className="text-sm font-semibold text-[var(--text)] mb-1">Sync Zone</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Sync platform-managed records with your DNS provider.
            {/* TODO (backend): POST /api/v1/projects/:projectId/domains/:domainId/sync-zone */}
          </p>
          <Button size="sm" variant="secondary" loading={syncing} onClick={handleSync}>
            Sync Zone
          </Button>
        </Card>
        <Card className="border border-[var(--rail)]" padding="md">
          <h3 className="text-sm font-semibold text-[var(--text)] mb-1">Import Zone</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Import existing records from your DNS provider.
            {/* TODO (backend): POST /api/v1/projects/:projectId/domains/:domainId/import-zone */}
          </p>
          <Button size="sm" variant="secondary" loading={importing} onClick={handleImport}>
            Import Zone
          </Button>
        </Card>
      </div>

      {/* Open incidents */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text)] mb-3">
          Open Incidents
          {openIncidents.length > 0 && (
            <Badge variant="danger" className="ml-2">{openIncidents.length}</Badge>
          )}
        </h2>
        {openIncidents.length === 0 ? (
          <Card className="border border-[var(--rail)]" padding="lg">
            <p className="text-sm text-[var(--text-muted)] text-center py-4">No open incidents — domain is healthy.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {openIncidents.map(inc => <IncidentCard key={inc.id} incident={inc} />)}
          </div>
        )}
      </div>

      {/* Verification history */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Verification History</h2>
        <Card className="border border-[var(--rail)]" padding="none">
          {history.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-[var(--text-muted)]">No verification history yet.</p>
            </div>
          ) : (
            <div className="px-4">
              {history.slice(0, 10).map(run => <HistoryRow key={run.id} run={run} />)}
            </div>
          )}
        </Card>
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
