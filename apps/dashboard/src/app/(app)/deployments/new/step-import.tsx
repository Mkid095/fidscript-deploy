'use client';

import { Card, Input, Dropzone } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { GithubIcon, HardDriveIcon, Link01Icon } from '@hugeicons/core-free-icons';

import { MAX_ARCHIVE_BYTES } from '@/lib/deployment-source';
import {
  GithubConnectBanner,
  RepoBrowser,
  BranchPicker,
} from '@/app/(app)/projects/[projectId]/services/new/github-connect-banner';
import type { GithubRepo, GithubBranch, GithubStatus } from './new-deployment-types';
import type { ImportSource } from './new-deployment-types';

interface StepImportProps {
  source: ImportSource;
  onSourceChange: (source: ImportSource) => void;

  githubStatus: GithubStatus | null;
  repos: GithubRepo[];
  repoHasMore: boolean;
  repoLoading: boolean;
  repoSearch: string;
  selectedRepo: GithubRepo | null;
  branches: GithubBranch[];
  branchLoading: boolean;
  selectedBranch: string;
  onConnectGithub: () => void;
  onSelectRepo: (repo: GithubRepo) => void;
  onClearRepo: () => void;
  onLoadMoreRepos: () => void;
  onRepoSearchChange: (value: string) => void;
  onBranchSelect: (branch: string) => void;

  manualGitUrl: string;
  onManualGitUrlChange: (value: string) => void;

  archiveFile: File | null;
  onArchiveChange: (file: File | null) => void;
}

const SOURCES: { key: ImportSource; label: string; hint: string; Icon: typeof GithubIcon }[] = [
  { key: 'github', label: 'Connect GitHub', hint: 'Browse your repositories and branches', Icon: GithubIcon },
  { key: 'git', label: 'Import a git repository', hint: 'Any git URL — a host you control', Icon: Link01Icon },
  { key: 'archive', label: 'Upload the code', hint: 'A .zip or .tar.gz of your project', Icon: HardDriveIcon },
];

/**
 * Step one — where the code comes from.
 *
 * GitHub is what the platform recommends: a connected account means the
 * platform can follow the repository, redeploy on a push and roll back. The
 * other two are there because the code does not always live on GitHub.
 */
export function StepImport(props: StepImportProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SOURCES.map(({ key, label, hint, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => props.onSourceChange(key)}
            className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${
              props.source === key
                ? 'border-[var(--accent)]/60 bg-[var(--accent)]/5'
                : 'border-[var(--rail)] bg-[var(--surface-2)] hover:border-[var(--rail-light)]'
            }`}
          >
            <HugeiconsIcon
              icon={Icon}
              size={18}
              className={`mt-0.5 flex-shrink-0 ${props.source === key ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'}`}
            />
            <span>
              <span className={`block text-sm font-medium ${props.source === key ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                {label}
              </span>
              <span className="block text-xs text-[var(--text-dim)] mt-0.5">{hint}</span>
            </span>
          </button>
        ))}
      </div>

      {props.source === 'github' && (
        <div className="space-y-4">
          {!props.githubStatus?.connected && (
            <GithubConnectBanner onConnect={props.onConnectGithub} connecting={false} />
          )}
          {props.githubStatus?.connected && !props.selectedRepo && (
            <RepoBrowser
              username={props.githubStatus.username}
              repos={filterRepos(props.repos, props.repoSearch)}
              repoPage={1}
              repoHasMore={props.repoHasMore}
              repoLoading={props.repoLoading}
              repoSearch={props.repoSearch}
              onSelect={props.onSelectRepo}
              onLoadMore={props.onLoadMoreRepos}
              onSearchChange={props.onRepoSearchChange}
            />
          )}
          {props.githubStatus?.connected && props.selectedRepo && (
            <BranchPicker
              repo={props.selectedRepo}
              branches={props.branches}
              selectedBranch={props.selectedBranch}
              branchLoading={props.branchLoading}
              onBack={props.onClearRepo}
              onSelect={props.onBranchSelect}
            />
          )}
        </div>
      )}

      {props.source === 'git' && (
        <Card className="border border-[var(--rail)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Import a git repository</h2>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            The URL of the repository, and the branch to deploy.
          </p>
          <div className="space-y-3">
            <Input
              label="Repository URL"
              value={props.manualGitUrl}
              onChange={e => props.onManualGitUrlChange(e.target.value)}
              placeholder="https://github.com/user/repo.git"
            />
            <Input
              label="Branch"
              value={props.selectedBranch}
              onChange={e => props.onBranchSelect(e.target.value)}
              placeholder="main"
            />
          </div>
        </Card>
      )}

      {props.source === 'archive' && (
        <Card className="border border-[var(--rail)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Upload the code</h2>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            A .zip or .tar.gz of the project. It is uploaded once the project exists, and the
            platform works out what it is from the files inside.
          </p>
          <Dropzone
            accept=".zip,.tar.gz,.tgz,.tar,application/zip,application/gzip,application/x-tar"
            maxSizeBytes={MAX_ARCHIVE_BYTES}
            onFiles={files => props.onArchiveChange(files[0] ?? null)}
            title="Drag and drop your archive here"
            hint=".zip, .tar.gz — up to 500 MB"
          />
          {props.archiveFile && (
            <p className="text-xs text-[var(--text-muted)] mt-3">
              Ready to upload: <span className="font-mono text-[var(--text)]">{props.archiveFile.name}</span>
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

/** The repositories that match what was typed in the search box. */
function filterRepos(repos: GithubRepo[], search: string): GithubRepo[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return repos;
  return repos.filter(repo => repo.full_name.toLowerCase().includes(needle));
}
