'use client';

import { Card } from '@fidscript/ui';
import { GitBranchIcon, GitCommitIcon, Image01Icon, ExternalLinkIcon } from '@hugeicons/core-free-icons';

import type { Deployment } from '@/types';
import { MetadataRow } from './metadata-row';

interface MetadataPanelProps {
  deployment: Deployment;
}

export function MetadataPanel({ deployment }: MetadataPanelProps) {
  const hasMetadata = deployment.branch || deployment.commitSha || deployment.imageTag || deployment.sourceUrl || deployment.createdBy;

  if (!hasMetadata) return null;

  return (
    <Card className="border border-[var(--rail)] p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Deployment details</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetadataRow icon={GitBranchIcon} label="Branch" value={deployment.branch} mono copyable />
        <MetadataRow icon={GitCommitIcon} label="Commit" value={deployment.commitSha?.slice(0, 7)} mono copyable />
        <MetadataRow icon={Image01Icon} label="Image tag" value={deployment.imageTag} mono copyable />
        <MetadataRow icon={GitBranchIcon} label="Triggered by" value={deployment.createdBy} />
        <MetadataRow icon={ExternalLinkIcon} label="Source URL" value={deployment.sourceUrl} copyable className="sm:col-span-2" />
      </div>
    </Card>
  );
}
