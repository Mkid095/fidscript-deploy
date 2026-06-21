'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Spinner, Button } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import type { Deployment } from '@/types';

export default function DeploymentDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const deploymentId = params.deploymentId as string;

const STATE_MACHINE = [
  { key: 'PENDING',    label: 'Pending',    color: 'bg-blue-500' },
  { key: 'QUEUED',     label: 'Queued',     color: 'bg-blue-500' },
  { key: 'BUILDING',   label: 'Building',   color: 'bg-amber-500' },
  { key: 'DEPLOYING',  label: 'Deploying',  color: 'bg-amber-500' },
  { key: 'SUCCESS',    label: 'Success',    color: 'bg-emerald-500' },
  { key: 'FAILED',    label: 'Failed',    color: 'bg-red-500' },
  { key: 'STOPPED',   label: 'Stopped',   color: 'bg-slate-500' },
  { key: 'ROLLED_BACK',label: 'Rolled Back',color: 'bg-purple-500' },
  { key: 'BLOCKED',   label: 'Blocked',   color: 'bg-orange-500' },
];

function statusIndex(status?: string): number {
  return STATE_MACHINE.findIndex(s => s.key === status?.toUpperCase()) ?? 0;
}

function StateMachineTimeline({ status }: { status: string }) {
  const current = statusIndex(status);
  return (
    <div className="flex items-center gap-1">
      {STATE_MACHINE.filter(s => !['BLOCKED'].includes(s.key)).map((step, i) => {
        const reached = i <= current;
        const active = i === current;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold transition-colors ${reached ? step.color : 'bg-slate-800'}`}>
                {active ? (status?.toUpperCase() === 'FAILED' ? '✕' : '✓') : ''}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${active ? 'text-slate-200 font-medium' : 'text-slate-600'}`}>
                {step.label}
              </span>
            </div>
            {i < STATE_MACHINE.filter(s => !['BLOCKED'].includes(s.key)).length - 1 && (
              <div className={`w-8 h-0.5 mb-4 ${i < current ? STATE_MACHINE[i].color : 'bg-slate-800'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function statusColor(status?: string) {
  switch (status?.toUpperCase()) {
    case 'SUCCESS':     return 'bg-emerald-900/60 text-emerald-400 border-emerald-800';
    case 'FAILED':     return 'bg-red-900/60 text-red-400 border-red-800';
    case 'PENDING':
    case 'QUEUED':      return 'bg-blue-900/60 text-blue-400 border-blue-800';
    case 'BUILDING':
    case 'DEPLOYING':   return 'bg-amber-900/60 text-amber-400 border-amber-800';
    case 'STOPPED':     return 'bg-slate-800 text-slate-400 border-slate-700';
    case 'ROLLED_BACK':  return 'bg-purple-900/60 text-purple-400 border-purple-800';
    case 'BLOCKED':      return 'bg-orange-900/60 text-orange-400 border-orange-800';
    default:            return 'bg-slate-800 text-slate-400 border-slate-700';
  }
}

  const { getSdk } = useAuth();
  const router = useRouter();

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const [dep, logData] = await Promise.all([
        sdk.deployments.get(projectId, deploymentId),
        sdk.deployments.getLogs(projectId, deploymentId),
      ]);
      setDeployment(dep as Deployment);
      const raw = (logData as any).logs ?? logData ?? '';
      setLogs(typeof raw === 'string' ? raw : JSON.stringify(raw));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [projectId, deploymentId, getSdk]);

  useEffect(() => { load(); }, [load]);

  async function handleAction(action: string) {
    setActing(action);
    try {
      const sdk = getSdk();
      if (action === 'stop')     await sdk.deployments.stop(projectId, deploymentId);
      if (action === 'restart')  await sdk.deployments.restart(projectId, deploymentId);
      if (action === 'delete')   { await sdk.deployments.destroy(projectId, deploymentId); router.push(`/projects/${projectId}`); return; }
      if (action === 'rollback') await sdk.deployments.rollback(projectId, deploymentId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Action failed: ${action}`);
    } finally {
      setActing(null);
      setShowRollbackConfirm(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-64"><Spinner size="lg" /></div>;
  if (error || !deployment) return <div className="p-6"><p className="text-red-400 text-sm">{error ?? 'Not found'}</p></div>;

  const inFlight = ['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING'].includes(deployment.status?.toUpperCase() ?? '');
  const duration = deployment.completedAt
    ? Math.round((new Date(deployment.completedAt).getTime() - new Date(deployment.createdAt).getTime()) / 1000)
    : null;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Back link */}
      <Link href={`/projects/${projectId}?section=deployments`} className="text-sm text-slate-500 hover:text-slate-300 inline-flex items-center gap-1">
        ← Back to Deployments
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-sm px-2.5 py-1 rounded-full border capitalize font-medium ${statusColor(deployment.status)}`}>
              {deployment.status?.toLowerCase()}
            </span>
            {acting && <Spinner size="sm" />}
          </div>
          <p className="text-xs text-slate-500">
            {new Date(deployment.createdAt).toLocaleString()}
            {duration !== null && ` · ${duration}s`}
          </p>
          {deployment.deploymentUrl && (
            <div className="flex items-center gap-2 mt-2">
              <a href={deployment.deploymentUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:text-blue-400">
                {deployment.deploymentUrl}
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(deployment.deploymentUrl!)}
                className="text-xs text-slate-600 hover:text-slate-400"
              >
                Copy
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {inFlight && (
            <Button variant="secondary" size="sm" onClick={() => handleAction('stop')} loading={acting === 'stop'}>
              Stop
            </Button>
          )}
          {(deployment.status === 'STOPPED' || deployment.status === 'FAILED') && (
            <Button variant="secondary" size="sm" onClick={() => handleAction('restart')} loading={acting === 'restart'}>
              Restart
            </Button>
          )}
          {deployment.status === 'SUCCESS' && (
            <Button variant="secondary" size="sm" onClick={() => setShowRollbackConfirm(true)} loading={acting === 'rollback'}>
              Rollback
            </Button>
          )}
          {(deployment.status === 'SUCCESS' || deployment.status === 'STOPPED' || deployment.status === 'FAILED') && (
            <Button variant="danger" size="sm" onClick={() => handleAction('delete')} loading={acting === 'delete'}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* State machine timeline */}
      <Card className="border border-[#1e2130] p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Deployment Progress</h2>
        <StateMachineTimeline status={deployment.status} />
      </Card>

      {/* Build logs */}
      <Card className="border border-[#1e2130]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2130]">
          <h2 className="text-sm font-semibold text-slate-200">Build Logs</h2>
          <button
            onClick={() => setShowLogs(s => !s)}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            {showLogs ? 'Hide' : 'Show'}
          </button>
        </div>
        {showLogs && logs ? (
          <pre className="p-5 text-xs font-mono text-slate-400 overflow-x-auto max-h-96 leading-relaxed">
            {logs}
          </pre>
        ) : showLogs ? (
          <p className="p-5 text-xs text-slate-600">No build logs available.</p>
        ) : (
          <p className="p-5 text-xs text-slate-600">Click {`"Show"`} to view build logs.</p>
        )}
      </Card>

      {/* Rollback confirm */}
      {showRollbackConfirm && (
        <Card className="border border-amber-800/50 p-5">
          <p className="text-sm text-slate-200 mb-3">Roll back this deployment to its previous successful release?</p>
          <p className="text-xs text-slate-500 mb-4">A new deployment will be created using the image from the last successful release.</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowRollbackConfirm(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => handleAction('rollback')} loading={acting === 'rollback'}>
              Roll back
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
