'use client';

import { Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Rocket01Icon, GithubIcon, RefreshIcon } from '@hugeicons/core-free-icons';
import type { DeploymentTab } from './deployments-utils';

interface Props {
  tab: DeploymentTab;
  activeCount: number;
  totalCount: number;
  githubConnected: boolean;
  onSwitchTab: (t: DeploymentTab) => void;
  onRefresh: () => void;
  onNewDeployment: () => void;
  onConnectGithub: () => void;
}

export function DeploymentsListHeader({
  tab,
  activeCount,
  totalCount,
  githubConnected,
  onSwitchTab,
  onRefresh,
  onNewDeployment,
  onConnectGithub,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex gap-1 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg p-0.5">
        {(['active', 'all'] as DeploymentTab[]).map(item => (
          <button
            key={item}
            onClick={() => onSwitchTab(item)}
            className={`px-3.5 py-1.5 text-xs rounded-md ${
              tab === item ? 'bg-[var(--rail)] text-[var(--text)]' : 'text-[var(--text-muted)]'
            }`}
          >
            {item === 'active'
              ? `Active${activeCount ? ` (${activeCount})` : ''}`
              : `All${totalCount ? ` (${totalCount})` : ''}`}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] px-2.5 py-1.5"
        >
          <HugeiconsIcon icon={RefreshIcon} size={13} />
          Refresh
        </button>
        <Button
          variant="primary"
          size="sm"
          onClick={githubConnected ? onNewDeployment : onConnectGithub}
        >
          <HugeiconsIcon icon={githubConnected ? Rocket01Icon : GithubIcon} size={13} />
          {githubConnected ? 'New deployment' : 'Connect GitHub'}
        </Button>
      </div>
    </div>
  );
}
