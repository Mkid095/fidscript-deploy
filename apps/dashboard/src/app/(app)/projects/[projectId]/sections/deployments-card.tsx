'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete01Icon, ExternalLinkIcon, File01Icon, GitBranchIcon, MoreHorizontalIcon, PlayCircleIcon, RotateClockwiseIcon, Search01Icon, StopCircleIcon } from '@hugeicons/core-free-icons';
import { useAuth } from '@/contexts/auth-context';
import type { Deployment } from '@/types';
import { formatDeploymentDuration, getDeploymentStatus, isDeploymentInFlight } from './deployments-utils';

interface DeploymentCardProps {
  deployment: Deployment;
  projectId: string;
  onUpdate: (id: string, patch: Partial<Deployment>) => void;
  onRemove: (id: string) => void;
}

export function DeploymentCard({ deployment, projectId, onUpdate, onRemove }: DeploymentCardProps) {
  const { getSdk } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const status = getDeploymentStatus(deployment.status);

  useEffect(() => {
    if (!isMenuOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, [isMenuOpen]);

  async function runAction(nextAction: string) {
    setAction(nextAction);
    setIsMenuOpen(false);
    try {
      const deployments = getSdk().deployments;
      if (nextAction === 'stop') { await deployments.stop(projectId, deployment.id); onUpdate(deployment.id, { status: 'STOPPED' }); }
      if (nextAction === 'restart') { await deployments.restart(projectId, deployment.id); onUpdate(deployment.id, { status: 'PENDING' }); }
      if (nextAction === 'delete') { await deployments.destroy(projectId, deployment.id); onRemove(deployment.id); }
    } finally { setAction(null); }
  }

  const detailHref = `/projects/${projectId}/deployments/${deployment.id}`;
  const canRebuild = ['SUCCESS', 'STOPPED', 'FAILED'].includes(deployment.status);
  return (
    <Card className="border border-[var(--rail)] py-3 px-4 hover:border-[var(--rail-light)] transition-all duration-150 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dot}`} />
            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize font-medium ${status.badge}`}>{status.label}</span>
            {deployment.branch && <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]"><HugeiconsIcon icon={GitBranchIcon} size={11} />{deployment.branch}</span>}
            {deployment.commitSha && <code className="text-[10px] font-mono text-[var(--text-dim)] bg-[var(--rail)] px-1.5 py-0.5 rounded">{deployment.commitSha.slice(0, 7)}</code>}
            {deployment.imageTag && <code className="text-[10px] font-mono text-[var(--text-dim)] bg-[var(--rail)] px-1.5 py-0.5 rounded">{deployment.imageTag}</code>}
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] flex-wrap">
            <time title={new Date(deployment.createdAt).toLocaleString()}>{new Date(deployment.createdAt).toLocaleString()}</time>
            {deployment.completedAt && <span className="text-[var(--text-dim)]">· {formatDeploymentDuration(deployment.createdAt, deployment.completedAt)}</span>}
            {deployment.deploymentUrl && <a href={deployment.deploymentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[var(--accent)]"><HugeiconsIcon icon={ExternalLinkIcon} size={10} /><span className="truncate max-w-[200px]">{deployment.deploymentUrl.replace(/^https?:\/\//, '')}</span></a>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {action && <Spinner size="sm" />}
          <a href={detailHref} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-[var(--rail)] text-[var(--text-muted)] border border-[var(--rail-light)]"><HugeiconsIcon icon={File01Icon} size={12} /><span className="hidden sm:inline">Logs</span></a>
          {isDeploymentInFlight(deployment.status) && <button onClick={() => void runAction('stop')} disabled={Boolean(action)} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-[var(--rail)] text-[var(--text-muted)] border border-[var(--rail-light)]"><HugeiconsIcon icon={StopCircleIcon} size={12} /><span className="hidden sm:inline">Stop</span></button>}
          {(deployment.status === 'STOPPED' || deployment.status === 'FAILED') && <button onClick={() => void runAction('restart')} disabled={Boolean(action)} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-[var(--rail)] text-[var(--text-muted)] border border-[var(--rail-light)]"><HugeiconsIcon icon={PlayCircleIcon} size={12} /><span className="hidden sm:inline">Restart</span></button>}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(open => !open)} className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-dim)] hover:bg-[var(--rail)]" aria-label="Deployment menu"><HugeiconsIcon icon={MoreHorizontalIcon} size={15} /></button>
            {isMenuOpen && <div className="absolute right-0 top-full mt-1.5 w-44 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg shadow-2xl z-30 py-1">
              <a href={detailHref} className="flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--rail)]"><HugeiconsIcon icon={Search01Icon} size={13} />View detail</a>
              {canRebuild && <button onClick={() => void runAction('restart')} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--rail)]"><HugeiconsIcon icon={RotateClockwiseIcon} size={13} />Rebuild</button>}
              {canRebuild && <button onClick={() => void runAction('delete')} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--danger)] hover:bg-[var(--rail)]"><HugeiconsIcon icon={Delete01Icon} size={13} />Delete</button>}
            </div>}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function DeploymentCardSkeleton() {
  return <Card className="border border-[var(--rail)] py-4 px-4 animate-pulse"><div className="flex justify-between"><div className="space-y-2"><div className="w-32 h-4 rounded bg-[var(--rail)]" /><div className="w-20 h-3 rounded bg-[var(--rail)]" /></div><div className="w-20 h-8 rounded bg-[var(--rail)]" /></div></Card>;
}
