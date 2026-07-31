// Service card component

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowRight01Icon,
  GitBranchIcon,
  GlobeIcon,
  CirclePlusIcon,
  StopCircleIcon,
  PlayCircleIcon,
  Delete01Icon,
} from '@hugeicons/core-free-icons';
import { Button, Badge } from '@fidscript/ui';

import type { Project, Deployment } from '@/types';
import { statusMeta, isInFlight } from './services-utils';
import { DeploymentRow } from './deployment-row';
import type { ServiceGroup } from './services-utils';

interface ServiceCardProps {
  service: ServiceGroup;
  projectId: string;
  onAction: (id: string, action: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ServiceCard({ service, projectId, onAction, isExpanded, onToggle }: ServiceCardProps) {
  const router = useRouter();
  const latest = service.deployments[0];
  const meta = latest ? statusMeta(latest.status) : statusMeta(undefined);
  const inFlight = latest ? isInFlight(latest.status) : false;
  const activeCount = service.deployments.filter(d => isInFlight(d.status)).length;
  const latestDetail = latest?.id;

  return (
    <div className="border border-[var(--rail)] overflow-hidden flex flex-col hover:border-[var(--rail-light)] transition-colors rounded-lg bg-[var(--surface-2)]">
      <button onClick={onToggle}
        className="flex items-start gap-3 px-4 py-3.5 text-left w-full hover:bg-[var(--rail)]/30 transition-colors">
        <HugeiconsIcon icon={ArrowRight01Icon} size={14}
          className={`text-[var(--text-dim)] flex-shrink-0 mt-0.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[var(--text)]">{service.name}</h3>
            <Badge variant={meta.variant} className="text-[10px]">
              {inFlight ? `${meta.label}…` : meta.label}
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {activeCount > 0 ? <span className="text-[var(--warning)]">{activeCount} active</span> : null}
            {activeCount > 0 && ' · '}
            {service.deployments.length} deployment{service.deployments.length !== 1 ? 's' : ''}
          </p>
        </div>
      </button>

      {latest && (
        <div className="px-4 py-3 border-t border-[var(--rail)]/60 bg-[var(--surface-2)]/30">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] flex-wrap">
            {latest.branch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--rail)] rounded text-[var(--text-dim)]">
                <HugeiconsIcon icon={GitBranchIcon} size={10} />
                {latest.branch}
              </span>
            )}
            {latest.commitSha && (
              <code className="text-[10px] font-mono text-[var(--text-dim)] bg-[var(--rail)] px-1.5 py-0.5 rounded">
                {latest.commitSha.slice(0, 7)}
              </code>
            )}
            <span className="text-[10px] text-[var(--text-dim)] ml-auto">{relativeTime(latest.createdAt)}</span>
          </div>
          {latest.deploymentUrl && !inFlight && (
            <a href={latest.deploymentUrl} target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent)] transition-colors max-w-full group">
              <HugeiconsIcon icon={GlobeIcon} size={12} className="flex-shrink-0" />
              <span className="truncate group-hover:underline">{latest.deploymentUrl.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[var(--rail)]/60 mt-auto">
        {latestDetail && (
          <Link href={`/projects/${projectId}/deployments/${latestDetail}`}
            className="text-xs text-[var(--accent)] hover:text-[var(--accent)] transition-colors font-medium">
            View history
          </Link>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {inFlight && (
            <button onClick={() => onAction(latest!.id, 'stop')}
              className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--warning)] hover:bg-[var(--hover)] transition-colors" title="Stop deployment">
              <HugeiconsIcon icon={StopCircleIcon} size={14} />
            </button>
          )}
          {(latest?.status === 'STOPPED' || latest?.status === 'FAILED') && (
            <button onClick={() => onAction(latest!.id, 'restart')}
              className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--success)] hover:bg-[var(--hover)] transition-colors" title="Restart deployment">
              <HugeiconsIcon icon={PlayCircleIcon} size={14} />
            </button>
          )}
          <button onClick={() => onAction(latest!.id, 'delete')}
            className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--danger)] hover:bg-[var(--hover)] transition-colors" title="Delete deployment">
            <HugeiconsIcon icon={Delete01Icon} size={14} />
          </button>
        </div>
        <Button variant="outline" size="sm"
          onClick={e => { e.stopPropagation(); router.push(`/projects/${projectId}/services/new`); }}
          className="flex items-center gap-1.5 text-xs ml-2">
          <HugeiconsIcon icon={CirclePlusIcon} size={12} />
          New
        </Button>
      </div>

      {isExpanded && (
        <div className="border-t border-[var(--rail)] divide-y divide-[var(--rail)]/50">
          {service.deployments.slice(0, 5).map((d, i) => (
            <DeploymentRow key={d.id} deployment={d} projectId={projectId} onAction={onAction} isFirst={i === 0} />
          ))}
          {service.deployments.length > 5 && (
            <div className="py-2 px-4 text-center">
              <Link href={`/projects/${projectId}/deployments/${latestDetail}`}
                className="text-xs text-[var(--accent)] hover:text-[var(--accent)] transition-colors">
                View all {service.deployments.length} deployments →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function relativeTime(iso?: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
