'use client';

/**
 * New Deployment wizard — dedicated page replacing the popup modal.
 *
 * Route: /projects/[projectId]/services/new
 *
 * A 4-step flow with a horizontal Stepper, scrollable form, and a sticky
 * footer (Back / Continue / Deploy). Fully responsive: single-column on
 * mobile, centered max-w-2xl on desktop.
 *
 * Steps:
 *   1. Source  — choose Git repository or Archive upload
 *   2. Select  — pick repo+branch (git) OR upload archive file (archive)
 *   3. Configure — dockerfile path, build preview
 *   4. Review  — summary + Deploy button
 *
 * Navigation: Back in the header returns to /services. Each step persists to
 * component state. On success → toast + navigate to the services list.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Input, Spinner, Stepper, Dropzone, Tabs } from '@fidscript/ui';
import type { StepperStep } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  GithubIcon,
  HardDriveIcon,
  GitBranchIcon,
  LockKeyIcon,
  File01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Upload02Icon,
} from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import { useProjectContext } from '@/contexts/project-context';
import { ToastProvider, useToast } from '@/components/toast-provider';
import { API_BASE_URL } from '@/lib/sdk';

// ── Types ─────────────────────────────────────────────────────────────────────

type SourceType = 'git' | 'archive';
type StepId = 'source' | 'select' | 'configure' | 'review';

interface GithubRepo {
  name: string;
  full_name: string;
  default_branch: string;
  private: boolean;
  updated_at?: string;
}
interface GithubBranch { name: string; }
interface GithubStatus { connected: boolean; username?: string; avatarUrl?: string; }

const STEPS: StepperStep[] = [
  { label: 'Source' },
  { label: 'Repository' },
  { label: 'Configuration' },
  { label: 'Review' },
];

const MAX_ARCHIVE_BYTES = 500 * 1024 * 1024; // 500 MB

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractRepoInfo(url: string): { repo: string; owner: string } {
  const sshMatch = url.match(/git@[^:]+:([^/]+)\/([^/]+?)(?:\.git)?$/);
  const httpsMatch = url.match(/https?:\/\/[^/]+\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) return { owner: sshMatch[1], repo: `${sshMatch[1]}/${sshMatch[2]}` };
  if (httpsMatch) return { owner: httpsMatch[1], repo: `${httpsMatch[1]}/${httpsMatch[2]}` };
  return { owner: '', repo: url };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}

function getAccessToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '';
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewDeploymentPageWrapper() {
  const { project } = useProjectContext();
  if (!project) return <div className="p-6 text-sm text-slate-500">Loading project…</div>;
  return (
    <ToastProvider>
      <NewDeploymentPage project={project} />
    </ToastProvider>
  );
}

function NewDeploymentPage({ project }: { project: NonNullable<ReturnType<typeof useProjectContext>['project']> }) {
  const router = useRouter();
  const { getSdk } = useAuth();
  const { showToast } = useToast();

  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  // Source selection
  const [sourceType, setSourceType] = useState<SourceType>('git');

  // Git fields
  const [githubStatus, setGithubStatus] = useState<GithubStatus | null>(null);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [repoPage, setRepoPage] = useState(1);
  const [repoHasMore, setRepoHasMore] = useState(false);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [branches, setBranches] = useState<GithubBranch[]>([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [manualGitUrl, setManualGitUrl] = useState('');
  const [credentials, setCredentials] = useState('');

  // Archive fields
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [uploadingArchive, setUploadingArchive] = useState(false);
  const [uploadedArchive, setUploadedArchive] = useState<{ bucketId: string; objectKey: string } | null>(null);

  // Shared config
  const [dockerfilePath, setDockerfilePath] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Load GitHub status ──────────────────────────────────────────────────────

  useEffect(() => {
    getSdk().github.status().then(setGithubStatus).catch(() => setGithubStatus({ connected: false }));
  }, [getSdk]);

  const loadRepos = useCallback(async (page: number, append: boolean) => {
    setRepoLoading(true);
    try {
      const res = await getSdk().github.listRepos(page, 30);
      const fetched = (res.repos ?? []) as GithubRepo[];
      setRepos(prev => append ? [...prev, ...fetched] : fetched);
      setRepoPage(page);
      setRepoHasMore(res.hasMore ?? false);
    } catch {
      showToast({ type: 'error', message: 'Failed to load repositories' });
    } finally {
      setRepoLoading(false);
    }
  }, [getSdk, showToast]);

  // Auto-load repos when GitHub is connected and entering the select step with git source
  useEffect(() => {
    if (githubStatus?.connected && sourceType === 'git' && repos.length === 0 && !repoLoading) {
      loadRepos(1, false);
    }
  }, [githubStatus, sourceType, repos.length, repoLoading, loadRepos]);

  const handleSelectRepo = useCallback(async (repo: GithubRepo) => {
    setSelectedRepo(repo);
    setSelectedBranch(repo.default_branch || 'main');
    setBranchLoading(true);
    try {
      const [owner, name] = repo.full_name.split('/');
      const res = await getSdk().github.listBranches(owner, name);
      setBranches(res as GithubBranch[]);
    } catch {
      showToast({ type: 'error', message: 'Failed to load branches' });
    } finally {
      setBranchLoading(false);
    }
  }, [getSdk, showToast]);

  const handleConnectGithub = useCallback(async () => {
    try {
      await getSdk().github.connect();
      const status = await getSdk().github.status();
      setGithubStatus(status);
      if (status.connected) showToast({ type: 'success', message: `Connected to GitHub as ${status.username}` });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'GitHub connection failed' });
    }
  }, [getSdk, showToast]);

  // ── Archive upload ──────────────────────────────────────────────────────────

  const uploadArchive = useCallback(async (file: File) => {
    if (!project) return;
    setUploadingArchive(true);
    setUploadedArchive(null);
    try {
      const token = getAccessToken();
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');
      const objectKey = `deploys/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      // 1. Ensure a deploy bucket exists (create if missing).
      const bucketsRes = await fetch(`${API_BASE_URL}/projects/${project.id}/storage/buckets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bucketsData = await bucketsRes.json();
      let bucket = (bucketsData.buckets ?? []).find((b: { name: string }) => b.name === 'deploys');
      if (!bucket) {
        const createRes = await fetch(`${API_BASE_URL}/projects/${project.id}/storage/buckets`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'deploys', provider: 'internal' }),
        });
        bucket = await createRes.json();
      }

      // 2. Upload the archive (base64 JSON, matching the storage controller).
      const uploadRes = await fetch(`${API_BASE_URL}/projects/${project.id}/storage/buckets/${bucket.id}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: base64, key: objectKey, originalName: file.name, mimeType: file.type || 'application/octet-stream' }),
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.message ?? `Upload failed (HTTP ${uploadRes.status})`);
      }
      setUploadedArchive({ bucketId: bucket.id, objectKey });
      showToast({ type: 'success', message: `Uploaded ${file.name} (${formatBytes(file.size)})` });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Archive upload failed' });
      setArchiveFile(null);
    } finally {
      setUploadingArchive(false);
    }
  }, [project, showToast]);

  // ── Derived state ───────────────────────────────────────────────────────────

  const gitUrl = selectedRepo ? `https://github.com/${selectedRepo.full_name}.git` : manualGitUrl.trim();
  const effectiveBranch = selectedRepo ? selectedBranch : (manualGitUrl ? 'main' : '');

  const canContinue = useMemo(() => {
    if (stepIndex === 0) return true; // source type always selected
    if (stepIndex === 1) {
      if (sourceType === 'git') return !!gitUrl;
      return !!uploadedArchive;
    }
    return true;
  }, [stepIndex, sourceType, gitUrl, uploadedArchive]);

  const handleContinue = () => {
    setCompleted(prev => new Set(prev).add(stepIndex));
    setStepIndex(i => Math.min(i + 1, STEPS.length - 1));
  };

  const handleBack = () => setStepIndex(i => Math.max(i - 1, 0));

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleDeploy = async () => {
    if (!project) return;
    setSubmitting(true);
    try {
      const sdk = getSdk();
      if (sourceType === 'git') {
        await sdk.deployments.create(project.id, {
          source: {
            type: 'git',
            git: {
              url: gitUrl,
              branch: effectiveBranch || 'main',
              ...(dockerfilePath.trim() && { dockerfilePath: dockerfilePath.trim() }),
              ...(credentials.trim() && { credentials: credentials.trim() }),
            },
          },
          branch: effectiveBranch || 'main',
        });
      } else if (uploadedArchive) {
        await sdk.deployments.create(project.id, {
          source: {
            type: 'archive',
            archive: {
              bucketId: uploadedArchive.bucketId,
              objectKey: uploadedArchive.objectKey,
              ...(dockerfilePath.trim() && { dockerfilePath: dockerfilePath.trim() }),
            },
          },
        } as any);
      }
      showToast({ type: 'success', message: 'Deployment queued — building now.' });
      router.push(`/projects/${project.id}/services`);
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Deployment failed' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtered repos (client-side search) ─────────────────────────────────────

  const filteredRepos = useMemo(() => {
    if (!repoSearch.trim()) return repos;
    const q = repoSearch.toLowerCase();
    return repos.filter(r => r.full_name.toLowerCase().includes(q));
  }, [repos, repoSearch]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-[#1e2130]">
        <div className="max-w-2xl mx-auto">
          <Link
            href={`/projects/${project.id}/services`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-3"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={12} />
            Back to services
          </Link>
          <h1 className="text-xl font-bold text-slate-200">New deployment</h1>

          {/* Mobile compact step indicator */}
          <p className="sm:hidden mt-2 text-xs text-slate-500">
            Step {stepIndex + 1} of {STEPS.length}: <span className="text-slate-300 font-medium">{STEPS[stepIndex].label}</span>
          </p>

          {/* Desktop stepper */}
          <div className="hidden sm:block mt-4">
            <Stepper
              steps={STEPS}
              current={stepIndex}
              completed={completed}
              onStepClick={i => i <= Math.max(...completed, stepIndex) && setStepIndex(i)}
            />
          </div>
        </div>
      </div>

      {/* Scrollable form area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* ── Step 1: Source ── */}
          {stepIndex === 0 && (
            <Card className="border border-[#1e2130] p-5">
              <h2 className="text-sm font-semibold text-slate-200 mb-1">Choose a source</h2>
              <p className="text-xs text-slate-500 mb-4">How do you want to provide your code?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { key: 'git', label: 'Git repository', desc: 'Clone from GitHub or any git URL', icon: GithubIcon },
                  { key: 'archive', label: 'Archive upload', desc: 'Upload a .zip or .tar.gz', icon: HardDriveIcon },
                ] as const).map(s => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSourceType(s.key)}
                    className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${
                      sourceType === s.key
                        ? 'border-red-500/60 bg-red-500/5'
                        : 'border-[#1e2130] bg-[#080a0d] hover:border-[#2a2d3a]'
                    }`}
                  >
                    <HugeiconsIcon icon={s.icon} size={20} className={sourceType === s.key ? 'text-red-400 mt-0.5' : 'text-slate-600 mt-0.5'} />
                    <div>
                      <p className={`text-sm font-medium ${sourceType === s.key ? 'text-slate-100' : 'text-slate-300'}`}>{s.label}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* ── Step 2: Select ── */}
          {stepIndex === 1 && sourceType === 'git' && (
            <>
              {/* GitHub connection banner */}
              {!githubStatus?.connected && (
                <Card className="border border-[#1e2130] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <HugeiconsIcon icon={GithubIcon} size={20} className="text-slate-400" />
                    <div>
                      <h2 className="text-sm font-semibold text-slate-200">Connect GitHub</h2>
                      <p className="text-xs text-slate-500">Browse your repositories and branches with one click.</p>
                    </div>
                  </div>
                  <Button variant="primary" size="sm" onClick={handleConnectGithub} className="flex items-center gap-2">
                    <HugeiconsIcon icon={GithubIcon} size={14} />
                    Connect GitHub account
                  </Button>
                  <div className="mt-5 pt-4 border-t border-[#1e2130]">
                    <p className="text-xs text-slate-500 mb-2">Or paste a git URL manually:</p>
                    <Input
                      value={manualGitUrl}
                      onChange={e => setManualGitUrl(e.target.value)}
                      placeholder="https://github.com/user/repo.git"
                      className="bg-[#080a0d] border border-[#1e2130] text-slate-200"
                    />
                  </div>
                </Card>
              )}

              {/* Repo browser */}
              {githubStatus?.connected && !selectedRepo && (
                <Card className="border border-[#1e2130] p-0 overflow-hidden">
                  <div className="p-4 border-b border-[#1e2130]">
                    <h2 className="text-sm font-semibold text-slate-200 mb-1">Select a repository</h2>
                    <p className="text-xs text-slate-500">Connected as {githubStatus.username}</p>
                  </div>
                  <div className="p-3 border-b border-[#1e2130]">
                    <Input
                      value={repoSearch}
                      onChange={e => setRepoSearch(e.target.value)}
                      placeholder="Search repositories…"
                      className="bg-[#080a0d] border border-[#1e2130] text-slate-200"
                    />
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-[#1e2130]">
                    {repoLoading && repos.length === 0 ? (
                      <div className="flex items-center justify-center py-8"><Spinner /></div>
                    ) : filteredRepos.length === 0 ? (
                      <p className="text-xs text-slate-500 py-6 text-center">No repositories found.</p>
                    ) : (
                      filteredRepos.map(r => (
                        <button
                          key={r.full_name}
                          onClick={() => handleSelectRepo(r)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1e2130]/50 transition-colors text-left"
                        >
                          <HugeiconsIcon icon={r.private ? LockKeyIcon : GithubIcon} size={14} className="text-slate-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-mono text-slate-300 truncate">{r.full_name}</p>
                            <p className="text-[10px] text-slate-600">{r.private ? 'Private' : 'Public'} · {r.default_branch}</p>
                          </div>
                          <HugeiconsIcon icon={ArrowRight01Icon} size={12} className="text-slate-700" />
                        </button>
                      ))
                    )}
                  </div>
                  {repoHasMore && (
                    <div className="p-3 border-t border-[#1e2130]">
                      <Button variant="ghost" size="sm" onClick={() => loadRepos(repoPage + 1, true)} loading={repoLoading} className="w-full">
                        Load more
                      </Button>
                    </div>
                  )}
                </Card>
              )}

              {/* Branch picker */}
              {githubStatus?.connected && selectedRepo && (
                <Card className="border border-[#1e2130] p-5">
                  <button
                    onClick={() => { setSelectedRepo(null); setBranches([]); }}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors mb-4"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={12} />
                    {selectedRepo.full_name}
                  </button>
                  <h2 className="text-sm font-semibold text-slate-200 mb-3">Select a branch</h2>
                  {branchLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 py-2"><Spinner size="sm" /> Loading branches…</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {branches.map(b => (
                        <button
                          key={b.name}
                          onClick={() => setSelectedBranch(b.name)}
                          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-all ${
                            selectedBranch === b.name
                              ? 'border-red-500/60 bg-red-500/10 text-slate-100'
                              : 'border-[#1e2130] bg-[#080a0d] text-slate-400 hover:border-[#2a2d3a]'
                          }`}
                        >
                          <HugeiconsIcon icon={GitBranchIcon} size={11} />
                          {b.name}
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </>
          )}

          {/* ── Step 2: Archive upload ── */}
          {stepIndex === 1 && sourceType === 'archive' && (
            <Card className="border border-[#1e2130] p-5">
              <h2 className="text-sm font-semibold text-slate-200 mb-1">Upload an archive</h2>
              <p className="text-xs text-slate-500 mb-4">Your archive must contain a Dockerfile at the root (or specify a path in the next step).</p>

              {!archiveFile && !uploadingArchive && (
                <Dropzone
                  accept=".zip,.tar.gz,.tgz,.tar,application/zip,application/gzip,application/x-tar"
                  maxSizeBytes={MAX_ARCHIVE_BYTES}
                  onFiles={files => { setArchiveFile(files[0]); uploadArchive(files[0]); }}
                  onError={msg => showToast({ type: 'error', message: msg })}
                  title="Drag and drop your archive here"
                  hint=".zip, .tar.gz — up to 500 MB"
                />
              )}

              {uploadingArchive && (
                <div className="flex flex-col items-center py-8">
                  <Spinner size="lg" />
                  <p className="text-sm text-slate-400 mt-3">Uploading {archiveFile?.name}…</p>
                  <p className="text-xs text-slate-600 mt-1">{archiveFile && formatBytes(archiveFile.size)}</p>
                </div>
              )}

              {!uploadingArchive && archiveFile && (
                <div className="rounded-lg border border-[#1e2130] bg-[#080a0d] p-4">
                  <div className="flex items-center gap-3">
                    <HugeiconsIcon icon={uploadedArchive ? CheckmarkCircle02Icon : Cancel01Icon} size={18} className={uploadedArchive ? 'text-emerald-400' : 'text-red-400'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{archiveFile.name}</p>
                      <p className="text-xs text-slate-600">{formatBytes(archiveFile.size)}</p>
                    </div>
                    {uploadedArchive && (
                      <button
                        onClick={() => { setArchiveFile(null); setUploadedArchive(null); }}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                      >
                        Replace
                      </button>
                    )}
                  </div>
                  {!uploadedArchive && (
                    <p className="text-xs text-red-400 mt-2">Upload failed — try a different file.</p>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* ── Step 3: Configure ── */}
          {stepIndex === 2 && (
            <Card className="border border-[#1e2130] p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-200">Build configuration</h2>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                  Dockerfile path <span className="text-slate-600 normal-case font-normal">(optional)</span>
                </label>
                <Input
                  value={dockerfilePath}
                  onChange={e => setDockerfilePath(e.target.value)}
                  placeholder="./Dockerfile"
                  className="bg-[#080a0d] border border-[#1e2130] text-slate-200"
                />
                <p className="text-[10px] text-slate-600 mt-1">Defaults to <code className="text-slate-500">./Dockerfile</code> at the source root.</p>
              </div>

              {sourceType === 'git' && !selectedRepo && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    Credentials <span className="text-slate-600 normal-case font-normal">(for private repos)</span>
                  </label>
                  <Input
                    value={credentials}
                    onChange={e => setCredentials(e.target.value)}
                    placeholder="Deploy key or user:token"
                    className="bg-[#080a0d] border border-[#1e2130] text-slate-200"
                  />
                  <p className="text-[10px] text-slate-600 mt-1">Stored encrypted, never logged.</p>
                </div>
              )}

              {/* Build preview */}
              <BuildPreview
                sourceType={sourceType}
                gitUrl={gitUrl}
                branch={effectiveBranch}
                repoName={selectedRepo?.full_name ?? extractRepoInfo(gitUrl).repo}
                archiveName={archiveFile?.name}
                archiveSize={archiveFile?.size}
                dockerfilePath={dockerfilePath}
              />
            </Card>
          )}

          {/* ── Step 4: Review ── */}
          {stepIndex === 3 && (
            <Card className="border border-[#1e2130] p-5">
              <h2 className="text-sm font-semibold text-slate-200 mb-4">Review & deploy</h2>
              <dl className="space-y-3">
                <ReviewRow label="Source type" value={sourceType === 'git' ? 'Git repository' : 'Archive upload'} />
                {sourceType === 'git' ? (
                  <>
                    <ReviewRow label="Repository" value={selectedRepo?.full_name ?? gitUrl} mono />
                    <ReviewRow label="Branch" value={effectiveBranch || 'main'} mono />
                  </>
                ) : (
                  <>
                    <ReviewRow label="Archive" value={archiveFile?.name ?? '—'} />
                    <ReviewRow label="Size" value={archiveFile ? formatBytes(archiveFile.size) : '—'} />
                  </>
                )}
                <ReviewRow label="Dockerfile" value={dockerfilePath || './Dockerfile (auto)'} mono />
              </dl>
              <div className="mt-5 pt-4 border-t border-[#1e2130]">
                <p className="text-xs text-slate-500">
                  Environment variables are managed in <Link href={`/projects/${project.id}/settings`} className="text-blue-400 hover:underline">project settings</Link>.
                  The deployment will build and start automatically once queued.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 inset-x-0 border-t border-[#1e2130] bg-[#0c0e14]/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack} disabled={stepIndex === 0}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={13} />
            Back
          </Button>
          {stepIndex < STEPS.length - 1 ? (
            <Button variant="primary" size="sm" onClick={handleContinue} disabled={!canContinue}>
              Continue
              <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleDeploy} loading={submitting} disabled={!canContinue}>
              <HugeiconsIcon icon={Upload02Icon} size={13} />
              {submitting ? 'Deploying…' : 'Deploy'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BuildPreview(props: {
  sourceType: SourceType;
  gitUrl: string;
  branch: string;
  repoName: string;
  archiveName?: string;
  archiveSize?: number;
  dockerfilePath: string;
}) {
  const imageName = props.sourceType === 'git'
    ? `fidscript/${props.repoName.replace('/', '-').toLowerCase()}`
    : `fidscript/archive-${Date.now().toString(36)}`;
  const tagSuffix = Date.now().toString(36);

  return (
    <div className="rounded-lg bg-[#080a0d] border border-[#1e2130] p-4 space-y-2.5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">What will build</p>
      <div className="flex items-start gap-2.5">
        <HugeiconsIcon icon={props.sourceType === 'git' ? GithubIcon : HardDriveIcon} size={13} className="text-slate-600 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-mono text-slate-300 truncate">
            {props.sourceType === 'git' ? props.repoName : props.archiveName ?? 'archive'}
          </p>
          {props.sourceType === 'git' && <p className="text-xs text-slate-600">github.com/{props.repoName}</p>}
        </div>
      </div>
      {props.sourceType === 'git' && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <HugeiconsIcon icon={GitBranchIcon} size={13} className="text-slate-600" />
          <span className="font-mono text-slate-300">{props.branch || 'main'}</span>
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <HugeiconsIcon icon={File01Icon} size={13} className="text-slate-600" />
        <span className="font-mono text-slate-300">{props.dockerfilePath ? `Dockerfile at ${props.dockerfilePath}` : 'Dockerfile (auto-detect)'}</span>
      </div>
      <div className="border-t border-[#1e2130] pt-2 mt-1">
        <p className="text-xs text-slate-600 mb-1">Resulting image tag</p>
        <code className="text-[10px] font-mono text-slate-400 bg-[#1e2130] px-2 py-1 rounded block truncate">
          {imageName}:{(props.branch || 'archive').replace(/\//g, '-')}-{tagSuffix}
        </code>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs text-slate-500 flex-shrink-0 pt-0.5">{label}</dt>
      <dd className={`text-sm text-slate-200 text-right min-w-0 truncate ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
