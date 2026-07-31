// Step 1: Repository/branch selection or archive upload

import { Card, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Cancel01Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Dropzone } from '@fidscript/ui';

import type { SourceType, GithubRepo, GithubBranch, GithubStatus } from './new-deploy-utils';
import { MAX_ARCHIVE_BYTES, formatBytes } from './new-deploy-utils';
import { GithubConnectBanner, RepoBrowser, BranchPicker } from './github-connect-banner';

interface StepSelectProps {
  sourceType: SourceType;
  githubStatus: GithubStatus | null;
  repos: GithubRepo[];
  repoPage: number;
  repoHasMore: boolean;
  repoLoading: boolean;
  repoSearch: string;
  selectedRepo: GithubRepo | null;
  branches: GithubBranch[];
  branchLoading: boolean;
  selectedBranch: string;
  manualGitUrl: string;
  archiveFile: File | null;
  uploadedArchive: { bucketId: string; objectKey: string } | null;
  uploadingArchive: boolean;
  onSelectRepo: (repo: GithubRepo) => void;
  onClearRepo: () => void;
  onLoadMoreRepos: () => void;
  onRepoSearchChange: (v: string) => void;
  onBranchSelect: (b: string) => void;
  onManualUrlChange: (v: string) => void;
  onConnectGithub: () => void;
  onArchiveChange: (f: File | null) => void;
  onUploadArchive: (f: File) => void;
  onReplaceArchive: () => void;
  onShowToast: (opts: { type: string; message: string }) => void;
}

export function StepSelect({
  sourceType, githubStatus, repos, repoPage, repoHasMore, repoLoading, repoSearch,
  selectedRepo, branches, branchLoading, selectedBranch, manualGitUrl,
  archiveFile, uploadedArchive, uploadingArchive,
  onSelectRepo, onClearRepo, onLoadMoreRepos, onRepoSearchChange, onBranchSelect, onManualUrlChange,
  onConnectGithub, onArchiveChange, onUploadArchive, onReplaceArchive, onShowToast,
}: StepSelectProps) {
  if (sourceType === 'git') {
    return (
      <>
        {!githubStatus?.connected && (
          <GithubConnectBanner onConnect={onConnectGithub} connecting={false} />
        )}
        {!githubStatus?.connected && (
          <Card className="border border-[var(--rail)] p-5 mt-4">
            <p className="text-xs text-[var(--text-muted)] mb-2">Or paste a git URL manually:</p>
            <input value={manualGitUrl} onChange={e => onManualUrlChange(e.target.value)}
              placeholder="https://github.com/user/repo.git"
              className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--warning)]" />
          </Card>
        )}
        {githubStatus?.connected && !selectedRepo && (
          <RepoBrowser username={githubStatus.username} repos={repos} repoPage={repoPage} repoHasMore={repoHasMore}
            repoLoading={repoLoading} repoSearch={repoSearch}
            onSelect={onSelectRepo} onLoadMore={onLoadMoreRepos} onSearchChange={onRepoSearchChange} />
        )}
        {githubStatus?.connected && selectedRepo && (
          <BranchPicker repo={selectedRepo} branches={branches} selectedBranch={selectedBranch}
            branchLoading={branchLoading} onBack={onClearRepo} onSelect={onBranchSelect} />
        )}
      </>
    );
  }

  // Archive upload
  return (
    <Card className="border border-[var(--rail)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Upload an archive</h2>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Upload a .zip or .tar.gz containing your project. We&apos;ll auto-detect the framework and build it.
      </p>

      {!archiveFile && !uploadingArchive && (
        <Dropzone accept=".zip,.tar.gz,.tgz,.tar,application/zip,application/gzip,application/x-tar"
          maxSizeBytes={MAX_ARCHIVE_BYTES}
          onFiles={files => { onArchiveChange(files[0]); onUploadArchive(files[0]); }}
          onError={msg => onShowToast({ type: 'error', message: msg })}
          title="Drag and drop your archive here" hint=".zip, .tar.gz — up to 500 MB" />
      )}

      {uploadingArchive && (
        <div className="flex flex-col items-center py-8">
          <Spinner size="lg" />
          <p className="text-sm text-[var(--text-muted)] mt-3">Uploading {archiveFile?.name}…</p>
          <p className="text-xs text-[var(--text-dim)] mt-1">{archiveFile && formatBytes(archiveFile.size)}</p>
        </div>
      )}

      {!uploadingArchive && archiveFile && (
        <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-4">
          <div className="flex items-center gap-3">
            <HugeiconsIcon icon={uploadedArchive ? CheckmarkCircle02Icon : Cancel01Icon} size={18}
              className={uploadedArchive ? 'text-[var(--success)]' : 'text-[var(--danger)]'} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text)] truncate">{archiveFile.name}</p>
              <p className="text-xs text-[var(--text-dim)]">{formatBytes(archiveFile.size)}</p>
            </div>
            {uploadedArchive && (
              <button onClick={onReplaceArchive} className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors">Replace</button>
            )}
          </div>
          {!uploadedArchive && <p className="text-xs text-[var(--danger)] mt-2">Upload failed — try a different file.</p>}
        </div>
      )}
    </Card>
  );
}
