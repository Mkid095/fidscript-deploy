'use client';

import { Card, Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { GithubIcon, Rocket01Icon } from '@hugeicons/core-free-icons';

interface Props {
  githubConnected: boolean;
  githubConnecting: boolean;
  repositoryUrl: string;
  isDeploying: boolean;
  onUrlChange: (v: string) => void;
  onDeploy: (e: React.FormEvent) => void;
  onConnectGithub: () => void;
}

export function DeploymentsEmptyState({
  githubConnected,
  githubConnecting,
  repositoryUrl,
  isDeploying,
  onUrlChange,
  onDeploy,
  onConnectGithub,
}: Props) {
  return (
    <Card className="border border-[var(--rail)] py-8 px-5">
      <div className="flex flex-col items-center text-center mb-5">
        <HugeiconsIcon
          icon={githubConnected ? GithubIcon : Rocket01Icon}
          size={18}
          className={githubConnected ? 'text-[var(--text-muted)]' : 'text-[var(--text-dim)]'}
        />
        <p className="text-sm font-medium text-[var(--text-muted)] mt-3">
          {githubConnected ? 'No deployments yet' : 'Connect GitHub to deploy'}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {githubConnected
            ? 'Paste a Git URL below to deploy your first release.'
            : 'Connect your GitHub account to browse repos and deploy in one click.'}
        </p>
      </div>
      {githubConnected ? (
        <form onSubmit={onDeploy} className="flex gap-2.5 max-w-xl mx-auto">
          <input
            value={repositoryUrl}
            onChange={e => onUrlChange(e.target.value)}
            placeholder="https://github.com/user/repo"
            className="flex-1 px-3.5 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--rail)] text-sm text-[var(--text)]"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={isDeploying}
            disabled={!repositoryUrl.trim()}
          >
            Deploy
          </Button>
        </form>
      ) : (
        <div className="flex justify-center">
          <Button
            variant="primary"
            size="sm"
            onClick={onConnectGithub}
            loading={githubConnecting}
          >
            <HugeiconsIcon icon={GithubIcon} size={14} />
            {githubConnecting ? 'Redirecting…' : 'Connect GitHub'}
          </Button>
        </div>
      )}
    </Card>
  );
}
