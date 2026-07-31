// GitHub connection banner and branch picker for step-select

import { Card, Button, Input, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, ArrowRight01Icon, GithubIcon, LockKeyIcon, GitBranchIcon } from '@hugeicons/core-free-icons';

import type { GithubRepo, GithubBranch, GithubStatus } from './new-deploy-types';

interface GithubConnectBannerProps {
  onConnect: () => void;
  connecting: boolean;
}

export function GithubConnectBanner({ onConnect, connecting }: GithubConnectBannerProps) {
  return (
    <Card className="border border-[var(--rail)] p-5">
      <div className="flex items-center gap-3 mb-3">
        <HugeiconsIcon icon={GithubIcon} size={20} className="text-[var(--text-muted)]" />
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Connect GitHub</h2>
          <p className="text-xs text-[var(--text-muted)]">Browse your repositories and branches with one click.</p>
        </div>
      </div>
      <Button variant="primary" size="sm" onClick={onConnect} className="flex items-center gap-2" disabled={connecting}>
        <HugeiconsIcon icon={GithubIcon} size={14} />
        Connect GitHub account
      </Button>
    </Card>
  );
}

interface RepoBrowserProps {
  username?: string;
  repos: GithubRepo[];
  repoPage: number;
  repoHasMore: boolean;
  repoLoading: boolean;
  repoSearch: string;
  onSelect: (repo: GithubRepo) => void;
  onLoadMore: () => void;
  onSearchChange: (v: string) => void;
}

export function RepoBrowser({ username, repos, repoPage, repoHasMore, repoLoading, repoSearch, onSelect, onLoadMore, onSearchChange }: RepoBrowserProps) {
  return (
    <Card className="border border-[var(--rail)] p-0 overflow-hidden">
      <div className="p-4 border-b border-[var(--rail)]">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Select a repository</h2>
        <p className="text-xs text-[var(--text-muted)]">Connected as {username}</p>
      </div>
      <div className="p-3 border-b border-[var(--rail)]">
        <Input value={repoSearch} onChange={e => onSearchChange(e.target.value)}
          placeholder="Search repositories…" className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]" />
      </div>
      <div className="max-h-96 overflow-y-auto divide-y divide-[var(--rail)]">
        {repoLoading && repos.length === 0 ? (
          <div className="flex items-center justify-center py-8"><Spinner /></div>
        ) : repos.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-6 text-center">No repositories found.</p>
        ) : (
          repos.map(r => (
            <button key={r.full_name} onClick={() => onSelect(r)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--rail)]/50 transition-colors text-left">
              <HugeiconsIcon icon={r.private ? LockKeyIcon : GithubIcon} size={14} className="text-[var(--text-muted)] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-mono text-[var(--text-muted)] truncate">{r.full_name}</p>
                <p className="text-[10px] text-[var(--text-dim)]">{r.private ? 'Private' : 'Public'} · {r.default_branch}</p>
              </div>
              <HugeiconsIcon icon={ArrowRight01Icon} size={12} className="text-[var(--text-dim)]" />
            </button>
          ))
        )}
      </div>
      {repoHasMore && (
        <div className="p-3 border-t border-[var(--rail)]">
          <Button variant="ghost" size="sm" onClick={onLoadMore} loading={repoLoading} className="w-full">Load more</Button>
        </div>
      )}
    </Card>
  );
}

interface BranchPickerProps {
  repo: GithubRepo;
  branches: GithubBranch[];
  selectedBranch: string;
  branchLoading: boolean;
  onBack: () => void;
  onSelect: (b: string) => void;
}

export function BranchPicker({ repo, branches, selectedBranch, branchLoading, onBack, onSelect }: BranchPickerProps) {
  return (
    <Card className="border border-[var(--rail)] p-5">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent)] transition-colors mb-4">
        <HugeiconsIcon icon={ArrowLeft01Icon} size={12} />
        {repo.full_name}
      </button>
      <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Select a branch</h2>
      {branchLoading ? (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2"><Spinner size="sm" /> Loading branches…</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {branches.map(b => (
            <button key={b.name} onClick={() => onSelect(b.name)}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-all ${
                selectedBranch === b.name
                  ? 'border-[var(--danger)]/60 bg-[var(--danger)]/10 text-[var(--text)]'
                  : 'border-[var(--rail)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--rail-light)]'
              }`}>
              <HugeiconsIcon icon={GitBranchIcon} size={11} />
              {b.name}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
