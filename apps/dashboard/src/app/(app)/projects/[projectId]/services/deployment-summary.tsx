'use client';

// Deployment summary line — branch + commit + age + public URL.

import { HugeiconsIcon } from '@hugeicons/react';
import { GitBranchIcon, GlobeIcon } from '@hugeicons/core-free-icons';

import type { Deployment } from '@/types';
import { isInFlight, relativeTime } from './services-utils';

interface DeploymentSummaryProps {
  deployment: Deployment;
}

export function DeploymentSummary({ deployment }: DeploymentSummaryProps) {
  const inFlight = isInFlight(deployment.status);

  return (
    <div className="px-4 py-3 border-t border-[var(--rail)]/60 bg-[var(--surface-2)]/30">
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] flex-wrap">
        {deployment.branch && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--rail)] rounded text-[var(--text-dim)]">
            <HugeiconsIcon icon={GitBranchIcon} size={10} />
            {deployment.branch}
          </span>
        )}
        {deployment.commitSha && (
          <code className="text-[10px] font-mono text-[var(--text-dim)] bg-[var(--rail)] px-1.5 py-0.5 rounded">
            {deployment.commitSha.slice(0, 7)}
          </code>
        )}
        <span className="text-[10px] text-[var(--text-dim)] ml-auto">
          {relativeTime(deployment.createdAt)}
        </span>
      </div>
      {deployment.deploymentUrl && !inFlight && (
        <a
          href={deployment.deploymentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent)] transition-colors max-w-full group"
        >
          <HugeiconsIcon icon={GlobeIcon} size={12} className="flex-shrink-0" />
          <span className="truncate group-hover:underline">
            {deployment.deploymentUrl.replace(/^https?:\/\//, '')}
          </span>
        </a>
      )}
    </div>
  );
}
