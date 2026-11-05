'use client';

import { Card, Input, Dropzone } from '@fidscript/ui';

import { MAX_ARCHIVE_BYTES } from '@/lib/deployment-source';
import {
  GithubConnectBanner,
  RepoBrowser,
  BranchPicker,
} from '@/app/(app)/projects/[projectId]/services/new/github-connect-banner';
import type { GithubRepo, GithubBranch, GithubStatus } from './new-deployment-types';
import type { ImportSource } from './new-deployment-types';
import { SourceCards } from './source-cards';

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
      <SourceCards source={props.source} onSourceChange={props.onSourceChange} />

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
