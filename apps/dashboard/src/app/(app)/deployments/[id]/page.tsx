'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { createFidscript } from '@fidscript/sdk';
import { Card } from '@fidscript/ui';
import { Button } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';

import type { Deployment } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-700 text-slate-300',
  QUEUED: 'bg-yellow-900 text-yellow-400',
  BUILDING: 'bg-blue-900 text-blue-400',
  DEPLOYING: 'bg-cyan-900 text-cyan-400',
  SUCCESS: 'bg-emerald-900 text-emerald-400',
  FAILED: 'bg-red-900 text-red-400',
  CANCELLED: 'bg-slate-700 text-slate-400',
};

const STEPS = ['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING', 'SUCCESS'] as const;
type Step = typeof STEPS[number];

function Stepper({ status }: { status: string }) {
  const activeIndex = STEPS.indexOf(status as Step);
  const isFailed = status === 'FAILED' || status === 'CANCELLED';

  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((step, i) => {
        const isDone = activeIndex > i || (isFailed && i < activeIndex);
        const isActive = i === activeIndex && !isFailed;
        const isFailedStep = isFailed && i === activeIndex;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  isDone
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : isActive
                    ? 'bg-blue-600 border-blue-600 text-white animate-pulse'
                    : isFailedStep
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'bg-[#0f1117] border-[#1e2130] text-slate-500'
                }`}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1.5 ${isActive || isDone ? 'text-slate-200' : 'text-slate-600'}`}>
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-12 mx-1 ${
                  activeIndex > i && !isFailed ? 'bg-emerald-600' : 'bg-[#1e2130]'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function LogConsole({ deploymentId, projectId }: { deploymentId: string; projectId: string }) {
  const [logLines, setLogLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function stream() {
      const token = localStorage.getItem('fidscript_token');
      if (!token) return;
      const sdk = createFidscript({ apiKey: token });

      try {
        async function pollLogs() {
          while (!cancelled) {
            const data = await sdk.deployments.getLogs(projectId, deploymentId) as any;
            const logStr = typeof data === "string" ? data : (data?.logs ?? "");
            if (logStr) setLogLines(logStr.split("\n"));
            const dep = await sdk.deployments.get(projectId, deploymentId) as any;
            if (dep?.status && !["PENDING", "QUEUED", "BUILDING", "DEPLOYING"].includes(dep.status)) break;
            await new Promise(r => setTimeout(r, 3000));
          }
        }
        pollLogs();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Stream failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    stream();
    return () => { cancelled = true; };
  }, [deploymentId, projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logLines]);

  return (
    <div className="border border-[#1e2130] rounded-lg overflow-hidden">
      <div className="bg-[#0f1117] border-b border-[#1e2130] px-3 py-2 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">Build Log</span>
        {loading && <span className="text-xs text-slate-500">Streaming…</span>}
      </div>
      <div
        className="bg-[#0a0a0f] text-slate-300 font-mono text-xs p-4 overflow-y-auto"
        style={{ maxHeight: 400 }}
      >
        {loading && logLines.length === 0 && (
          <p className="text-slate-500">Waiting for logs…</p>
        )}
        {error && <p className="text-red-400">{error}</p>}
        {logLines.map((line, i) => (
          <p key={i} className="leading-relaxed whitespace-pre-wrap">{line}</p>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default function DeploymentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const deploymentId = params.id as string;
  const projectId = searchParams.get('project') ?? '';

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('fidscript_token');
      if (!token) { setLoading(false); return; }
      try {
        const sdk = createFidscript({ apiKey: token });
        const data = await sdk.deployments.get(projectId, deploymentId);
        setDeployment(data as Deployment);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deployment');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [deploymentId, projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !deployment) {
    return (
      <div>
        <Link href="/deployments" className="text-blue-500 text-sm hover:text-blue-400 no-underline">
          Back to Deployments
        </Link>
        <p className="text-red-400 mt-4 text-sm">{error || 'Deployment not found'}</p>
      </div>
    );
  }

  const isLive = deployment.status === 'BUILDING' || deployment.status === 'DEPLOYING' || deployment.status === 'QUEUED' || deployment.status === 'PENDING';

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/deployments${projectId ? `?project=${projectId}` : ''}`}
        className="text-sm text-slate-500 hover:text-slate-300 no-underline inline-flex items-center gap-1 mb-4"
      >
        Back to Deployments
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-200 mb-1">
              Deployment <span className="font-mono text-sm">{deployment.id.slice(0, 8)}</span>
            </h1>
            <p className="text-sm text-slate-500">
              Created {new Date(deployment.createdAt).toLocaleDateString()}{' '}
              {new Date(deployment.createdAt).toLocaleTimeString()}
              {deployment.completedAt && (
                <> &middot; Completed {new Date(deployment.completedAt).toLocaleDateString()}</>
              )}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_COLORS[deployment.status] ?? 'bg-slate-700 text-slate-300'}`}>
            {deployment.status}
          </span>
        </div>
      </div>

      {/* Stepper */}
      <Card className="border border-[#1e2130] mb-6">
        <Stepper status={deployment.status} />
      </Card>

      {/* Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="border border-[#1e2130]">
          <p className="text-xs text-slate-500 mb-1">Deployment ID</p>
          <p className="text-sm font-mono text-slate-200">{deployment.id}</p>
        </Card>
        <Card className="border border-[#1e2130]">
          <p className="text-xs text-slate-500 mb-1">Version</p>
          <p className="text-sm text-slate-200">{deployment.version}</p>
        </Card>
        {deployment.commitSha && (
          <Card className="border border-[#1e2130]">
            <p className="text-xs text-slate-500 mb-1">Commit</p>
            <p className="text-sm font-mono text-slate-200">{deployment.commitSha.slice(0, 8)}</p>
          </Card>
        )}
        {deployment.deploymentUrl && (
          <Card className="border border-[#1e2130]">
            <p className="text-xs text-slate-500 mb-1">URL</p>
            <a
              href={deployment.deploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300 no-underline"
            >
              {deployment.deploymentUrl}
            </a>
          </Card>
        )}
      </div>

      {/* Live log stream */}
      {isLive && projectId && (
        <div className="mb-6">
          <LogConsole deploymentId={deploymentId} projectId={projectId} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm">Rebuild</Button>
        {isLive && (
          <Button variant="danger" size="sm">Stop</Button>
        )}
        <Button variant="danger" size="sm">Delete</Button>
      </div>
    </div>
  );
}
