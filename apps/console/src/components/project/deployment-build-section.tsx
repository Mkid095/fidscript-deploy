'use client';

import { useEffect, useState } from 'react';

import { browserApi } from '@/lib/api/browser';
import { Badge } from '@/components/ui/feedback';
import { BuildLogViewer } from '@/components/project/build-log-viewer';

interface DeploymentSnapshot {
  id: string;
  status: string;
  deploymentUrl: string | null;
  release?: {
    buildDurationMs: number | null;
    version: string | null;
  } | null;
}

/**
 * The build, alive.
 *
 * While the deployment is on its way — queued, building, starting — the
 * status and the log are asked for again every couple of seconds, so the
 * screen shows the build instead of a photograph of its beginning. Once it
 * is over, the asking stops.
 */
export function DeploymentBuildSection({
  projectId,
  deploymentId,
  initialStatus,
  initialLogs,
}: {
  projectId: string;
  deploymentId: string;
  initialStatus: string;
  initialLogs: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [logs, setLogs] = useState(initialLogs);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const deployment = await browserApi.get<DeploymentSnapshot>(
          `/projects/${projectId}/deployments/${deploymentId}`,
        );
        if (cancelled) return;
        setStatus(deployment.status);
        setDurationMs(deployment.release?.buildDurationMs ?? null);
        const log = await browserApi
          .get<{
            logs: string;
          }>(`/projects/${projectId}/deployments/${deploymentId}/logs`)
          .catch(() => ({ logs: '' }));
        if (!cancelled) {
          setLogs((current) =>
            (log.logs ?? '').length >= current.length
              ? (log.logs ?? '')
              : current,
          );
        }
        const done = ['SUCCESS', 'FAILED', 'STOPPED', 'CANCELLED'].includes(
          deployment.status.toUpperCase(),
        );
        if (!done) timer = setTimeout(poll, 2500);
      } catch {
        if (!cancelled) timer = setTimeout(poll, 5000);
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [projectId, deploymentId]);

  const tone =
    status.toUpperCase() === 'SUCCESS'
      ? 'success'
      : status.toUpperCase() === 'FAILED'
        ? 'danger'
        : 'warning';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge tone={tone}>{status.toLowerCase()}</Badge>
        {status.toUpperCase() === 'SUCCESS' && durationMs ? (
          <span className="text-xs text-text-dim">
            built in {Math.round(durationMs / 100) / 10}s
          </span>
        ) : null}
      </div>
      <BuildLogViewer logs={logs} status={status} durationMs={durationMs} />
    </div>
  );
}
