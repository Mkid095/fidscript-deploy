// Deployment row component for expandable service history

import { useState } from 'react';
import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  GitBranchIcon,
  GlobeIcon,
  File01Icon,
  MoreHorizontalIcon,
  StopCircleIcon,
  PlayCircleIcon,
  Delete01Icon,
} from '@hugeicons/core-free-icons';
import { Badge } from '@fidscript/ui';

import type { Deployment } from '@/types';
import { statusMeta, isInFlight, relativeTime, formatDuration } from './services-utils';

interface DeploymentRowProps {
  deployment: Deployment;
  projectId: string;
  onAction: (id: string, action: string) => void;
  isFirst?: boolean;
}

export function DeploymentRow({ deployment, projectId, onAction, isFirst }: DeploymentRowProps) {
  const meta = statusMeta(deployment.status);
  const inFlight = isInFlight(deployment.status);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`py-2.5 px-4 transition-colors ${isFirst ? 'bg-[var(--surface-2)]/20' : 'hover:bg-[var(--rail)]/30'}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
        <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
        {deployment.branch && (
          <span className="flex items-center gap-1 text-xs text-[var(--text-dim)]">
            <HugeiconsIcon icon={GitBranchIcon} size={10} />
            {deployment.branch}
          </span>
        )}
        {deployment.commitSha && (
          <code className="text-[10px] font-mono text-[var(--text-dim)] bg-[var(--rail)] px-1.5 py-0.5 rounded">
            {deployment.commitSha.slice(0, 7)}
          </code>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] text-[var(--text-dim)]">
            {deployment.completedAt ? formatDuration(deployment.createdAt, deployment.completedAt) : '—'}
          </span>
          <span className="text-[10px] text-[var(--text-dim)]">·</span>
          <span className="text-[10px] text-[var(--text-dim)]">{relativeTime(deployment.createdAt)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1.5">
        {deployment.deploymentUrl && !inFlight && (
          <a href={deployment.deploymentUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-[var(--accent)] hover:text-[var(--accent)] transition-colors">
            <HugeiconsIcon icon={GlobeIcon} size={10} />
            <span className="truncate max-w-[120px]">{deployment.deploymentUrl.replace(/^https?:\/\//, '')}</span>
          </a>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <Link href={`/projects/${projectId}/deployments/${deployment.id}`}
            className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-muted)] hover:bg-[var(--hover)] transition-colors" title="View details">
            <HugeiconsIcon icon={File01Icon} size={13} />
          </Link>
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)}
              className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-muted)] hover:bg-[var(--hover)] transition-colors" aria-label="More actions">
              <HugeiconsIcon icon={MoreHorizontalIcon} size={13} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-36 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg shadow-xl py-1 z-20">
                {inFlight && (
                  <button onClick={() => { setMenuOpen(false); onAction(deployment.id, 'stop'); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--warning)] hover:bg-[var(--rail)]">
                    <HugeiconsIcon icon={StopCircleIcon} size={12} /> Stop
                  </button>
                )}
                {(deployment.status === 'STOPPED' || deployment.status === 'FAILED') && (
                  <button onClick={() => { setMenuOpen(false); onAction(deployment.id, 'restart'); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--success)] hover:bg-[var(--rail)]">
                    <HugeiconsIcon icon={PlayCircleIcon} size={12} /> Restart
                  </button>
                )}
                <button onClick={() => { setMenuOpen(false); onAction(deployment.id, 'delete'); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--danger)] hover:bg-[var(--rail)]">
                  <HugeiconsIcon icon={Delete01Icon} size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
