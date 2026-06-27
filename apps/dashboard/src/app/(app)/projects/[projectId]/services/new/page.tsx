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
  Settings01Icon,
  Rocket01Icon,
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
  if (!project) return <div className="p-6 text-sm text-[var(--text-muted)]">Loading project…</div>;
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [envText, setEnvText] = useState('');
  const [autoDeploy, setAutoDeploy] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Framework detection
  const [buildPlan, setBuildPlan] = useState<{
    framework: string; frameworkLabel: string; frameworkVersion?: string;
    buildCommand: string; outputDirectory: string; port: number; runtime: string; monorepo?: string;
  } | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  // ── Load GitHub status ──────────────────────────────────────────────────────

  useEffect(() => {
    getSdk().github.status().then(setGithubStatus).catch(() => setGithubStatus({ connected: false }));
  }, [getSdk]);

  // Auto-detect framework — defined below after gitUrl/effectiveBranch are available.

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

  // Auto-detect framework when entering Configure step (step 2) with a git URL.
  // Calls POST /deployments/detect which clones shallowly + runs detection.
  const runDetection = useCallback(async () => {
    if (!project || !gitUrl || buildPlan || detecting) return;
    setDetecting(true);
    setDetectError(null);
    try {
      const plan = await getSdk().deployments.detect(project.id, {
        gitUrl,
        branch: effectiveBranch || 'main',
        ...(credentials.trim() && { credentials: credentials.trim() }),
      });
      setBuildPlan(plan);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Detection failed';
      setDetectError(msg);
    } finally {
      setDetecting(false);
    }
  }, [project, gitUrl, effectiveBranch, credentials, buildPlan, detecting, getSdk]);

  // Trigger detection automatically when step changes to Configure (2)
  useEffect(() => {
    if (stepIndex === 2 && sourceType === 'git' && gitUrl && !buildPlan && !detecting) {
      runDetection();
    }
    // Reset detection when leaving the configure step back to repo selection
    if (stepIndex < 2) {
      setBuildPlan(null);
      setDetectError(null);
    }
  }, [stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Parse a .env-style textarea into a Record<string, string>.
  // Handles KEY=value, KEY="value", comments (#), and blank lines.
  const parseEnvText = useCallback((text: string): Record<string, string> => {
    const env: Record<string, string> = {};
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      let value = line.slice(eqIdx + 1).trim();
      // Strip surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key) env[key] = value;
    }
    return env;
  }, []);

  const parsedEnvVars = useMemo(() => parseEnvText(envText), [envText, parseEnvText]);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleDeploy = async () => {
    if (!project) return;
    setSubmitting(true);
    try {
      const sdk = getSdk();
      const envVars = Object.keys(parsedEnvVars).length > 0 ? parsedEnvVars : undefined;
      let deploymentId: string | undefined;
      if (sourceType === 'git') {
        const created = await sdk.deployments.create(project.id, {
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
          ...(envVars && { envVars }),
        });
        deploymentId = (created as { id?: string }).id;
      } else if (uploadedArchive) {
        const created = await sdk.deployments.create(project.id, {
          source: {
            type: 'archive',
            archive: {
              bucketId: uploadedArchive.bucketId,
              objectKey: uploadedArchive.objectKey,
              ...(dockerfilePath.trim() && { dockerfilePath: dockerfilePath.trim() }),
            },
          },
          ...(envVars && { envVars }),
        });
        deploymentId = (created as { id?: string }).id;
      }
      showToast({ type: 'success', message: 'Deployment queued — building now.' });
      // Send the user straight to the live build-log stream (Vercel-style),
      // not back to the services list — so they can watch + copy the build output.
      if (deploymentId) {
        router.push(`/projects/${project.id}/deployments/${deploymentId}`);
      } else {
        router.push(`/projects/${project.id}/services`);
      }
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
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-[var(--rail)]">
        <div className="max-w-2xl mx-auto">
          <Link
            href={`/projects/${project.id}/services`}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] transition-colors mb-3"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={12} />
            Back to services
          </Link>
          <h1 className="text-xl font-bold text-[var(--text)]">New deployment</h1>

          {/* Mobile compact step indicator */}
          <p className="sm:hidden mt-2 text-xs text-[var(--text-muted)]">
            Step {stepIndex + 1} of {STEPS.length}: <span className="text-[var(--text-muted)] font-medium">{STEPS[stepIndex].label}</span>
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
            <Card className="border border-[var(--rail)] p-5">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Choose a source</h2>
              <p className="text-xs text-[var(--text-muted)] mb-4">How do you want to provide your code?</p>
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
                        ? 'border-[var(--danger)]/60 bg-[var(--danger)]/5'
                        : 'border-[var(--rail)] bg-[var(--surface-2)] hover:border-[var(--rail-light)]'
                    }`}
                  >
                    <HugeiconsIcon icon={s.icon} size={20} className={sourceType === s.key ? 'text-[var(--danger)] mt-0.5' : 'text-[var(--text-dim)] mt-0.5'} />
                    <div>
                      <p className={`text-sm font-medium ${sourceType === s.key ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>{s.label}</p>
                      <p className="text-xs text-[var(--text-dim)] mt-0.5">{s.desc}</p>
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
                <Card className="border border-[var(--rail)] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <HugeiconsIcon icon={GithubIcon} size={20} className="text-[var(--text-muted)]" />
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--text)]">Connect GitHub</h2>
                      <p className="text-xs text-[var(--text-muted)]">Browse your repositories and branches with one click.</p>
                    </div>
                  </div>
                  <Button variant="primary" size="sm" onClick={handleConnectGithub} className="flex items-center gap-2">
                    <HugeiconsIcon icon={GithubIcon} size={14} />
                    Connect GitHub account
                  </Button>
                  <div className="mt-5 pt-4 border-t border-[var(--rail)]">
                    <p className="text-xs text-[var(--text-muted)] mb-2">Or paste a git URL manually:</p>
                    <Input
                      value={manualGitUrl}
                      onChange={e => setManualGitUrl(e.target.value)}
                      placeholder="https://github.com/user/repo.git"
                      className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]"
                    />
                  </div>
                </Card>
              )}

              {/* Repo browser */}
              {githubStatus?.connected && !selectedRepo && (
                <Card className="border border-[var(--rail)] p-0 overflow-hidden">
                  <div className="p-4 border-b border-[var(--rail)]">
                    <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Select a repository</h2>
                    <p className="text-xs text-[var(--text-muted)]">Connected as {githubStatus.username}</p>
                  </div>
                  <div className="p-3 border-b border-[var(--rail)]">
                    <Input
                      value={repoSearch}
                      onChange={e => setRepoSearch(e.target.value)}
                      placeholder="Search repositories…"
                      className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]"
                    />
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-[var(--rail)]">
                    {repoLoading && repos.length === 0 ? (
                      <div className="flex items-center justify-center py-8"><Spinner /></div>
                    ) : filteredRepos.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)] py-6 text-center">No repositories found.</p>
                    ) : (
                      filteredRepos.map(r => (
                        <button
                          key={r.full_name}
                          onClick={() => handleSelectRepo(r)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--rail)]/50 transition-colors text-left"
                        >
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
                      <Button variant="ghost" size="sm" onClick={() => loadRepos(repoPage + 1, true)} loading={repoLoading} className="w-full">
                        Load more
                      </Button>
                    </div>
                  )}
                </Card>
              )}

              {/* Branch picker */}
              {githubStatus?.connected && selectedRepo && (
                <Card className="border border-[var(--rail)] p-5">
                  <button
                    onClick={() => { setSelectedRepo(null); setBranches([]); }}
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent)] transition-colors mb-4"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={12} />
                    {selectedRepo.full_name}
                  </button>
                  <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Select a branch</h2>
                  {branchLoading ? (
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2"><Spinner size="sm" /> Loading branches…</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {branches.map(b => (
                        <button
                          key={b.name}
                          onClick={() => setSelectedBranch(b.name)}
                          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-all ${
                            selectedBranch === b.name
                              ? 'border-[var(--danger)]/60 bg-[var(--danger)]/10 text-[var(--text)]'
                              : 'border-[var(--rail)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--rail-light)]'
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
            <Card className="border border-[var(--rail)] p-5">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Upload an archive</h2>
              <p className="text-xs text-[var(--text-muted)] mb-4">Upload a .zip or .tar.gz containing your project. We&apos;ll auto-detect the framework and build it.</p>

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
                  <p className="text-sm text-[var(--text-muted)] mt-3">Uploading {archiveFile?.name}…</p>
                  <p className="text-xs text-[var(--text-dim)] mt-1">{archiveFile && formatBytes(archiveFile.size)}</p>
                </div>
              )}

              {!uploadingArchive && archiveFile && (
                <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center gap-3">
                    <HugeiconsIcon icon={uploadedArchive ? CheckmarkCircle02Icon : Cancel01Icon} size={18} className={uploadedArchive ? 'text-[var(--success)]' : 'text-[var(--danger)]'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text)] truncate">{archiveFile.name}</p>
                      <p className="text-xs text-[var(--text-dim)]">{formatBytes(archiveFile.size)}</p>
                    </div>
                    {uploadedArchive && (
                      <button
                        onClick={() => { setArchiveFile(null); setUploadedArchive(null); }}
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                      >
                        Replace
                      </button>
                    )}
                  </div>
                  {!uploadedArchive && (
                    <p className="text-xs text-[var(--danger)] mt-2">Upload failed — try a different file.</p>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* ── Step 3: Configure ── */}
          {stepIndex === 2 && (
            <Card className="border border-[var(--rail)] p-5 space-y-5">
              {/* Framework auto-detection */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <HugeiconsIcon icon={Rocket01Icon} size={16} className="text-[var(--success)]" />
                  <h2 className="text-sm font-semibold text-[var(--text)]">Framework detection</h2>
                </div>

                {detecting && (
                  <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-4 flex items-center gap-3">
                    <Spinner size="sm" />
                    <div>
                      <p className="text-sm text-[var(--text-muted)]">Detecting framework…</p>
                      <p className="text-xs text-[var(--text-dim)]">Cloning repository and analyzing files</p>
                    </div>
                  </div>
                )}

                {!detecting && buildPlan && (
                  <div className="rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-[var(--success)]" />
                      <span className="text-sm font-semibold text-[var(--text)]">
                        {buildPlan.frameworkLabel}{buildPlan.frameworkVersion ? ` ${buildPlan.frameworkVersion}` : ''}
                      </span>
                      {buildPlan.monorepo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] font-mono">
                          {buildPlan.monorepo} monorepo
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <span className="text-[var(--text-dim)]">Build</span>
                        <p className="text-[var(--text-muted)] font-mono mt-0.5 truncate">{buildPlan.buildCommand}</p>
                      </div>
                      <div>
                        <span className="text-[var(--text-dim)]">Output</span>
                        <p className="text-[var(--text-muted)] font-mono mt-0.5">{buildPlan.outputDirectory}</p>
                      </div>
                      <div>
                        <span className="text-[var(--text-dim)]">Port</span>
                        <p className="text-[var(--text-muted)] font-mono mt-0.5">{buildPlan.port}</p>
                      </div>
                      <div>
                        <span className="text-[var(--text-dim)]">Runtime</span>
                        <p className="text-[var(--text-muted)] font-mono mt-0.5">{buildPlan.runtime}</p>
                      </div>
                    </div>
                  </div>
                )}

                {!detecting && detectError && !buildPlan && (
                  <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="text-xs text-[var(--warning)] mt-0.5"></span>
                      <div>
                        <p className="text-sm text-[var(--text-muted)]">Could not auto-detect framework</p>
                        <p className="text-xs text-[var(--text-dim)] mt-0.5">{detectError}</p>
                        <p className="text-xs text-[var(--text-dim)] mt-1">The deployment will still proceed — provide a Dockerfile in Advanced settings if the build fails.</p>
                      </div>
                    </div>
                    <button onClick={runDetection} className="text-xs text-[var(--accent)] hover:text-[var(--accent)] flex-shrink-0">
                      Retry
                    </button>
                  </div>
                )}

                {!detecting && !buildPlan && !detectError && sourceType === 'git' && (
                  <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-[var(--text-muted)]">Ready to detect your framework.</p>
                    <button onClick={runDetection} className="text-xs text-[var(--accent)] hover:text-[var(--accent)]">
                      Detect now
                    </button>
                  </div>
                )}

                {!detecting && !buildPlan && !detectError && sourceType === 'archive' && (
                  <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-4">
                    <p className="text-sm text-[var(--text-muted)]">Automatic detection</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      We&apos;ll detect your framework when building the archive. Supported: Next.js, Nuxt, Astro, SvelteKit, Vite, Node.js, and static HTML.
                    </p>
                  </div>
                )}
              </div>

              {/* Environment variables */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                  Environment variables <span className="text-[var(--text-dim)] normal-case font-normal">(optional)</span>
                </label>
                <p className="text-xs text-[var(--text-muted)] mb-2">
                  Paste your <code className="text-[var(--text-dim)]">.env</code> file or add <code className="text-[var(--text-dim)]">KEY=value</code> pairs, one per line. These override project-level env vars for this deployment.
                </p>
                <textarea
                  value={envText}
                  onChange={e => setEnvText(e.target.value)}
                  placeholder={'DATABASE_URL=postgres://...\nAPI_SECRET=your-secret-here\n# Comments are ignored\nNEXT_PUBLIC_API_URL=https://...'}
                  rows={6}
                  className="w-full rounded-md bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] text-xs font-mono px-3 py-2.5 resize-y focus:outline-none focus:border-[var(--danger)]/40 placeholder:text-[var(--text-dim)]"
                  spellCheck={false}
                />
                {Object.keys(parsedEnvVars).length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--success)]">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />
                    {Object.keys(parsedEnvVars).length} variable{Object.keys(parsedEnvVars).length === 1 ? '' : 's'} ready
                  </div>
                )}
                <p className="text-[10px] text-[var(--text-dim)] mt-1.5">
                  Also configurable anytime in <Link href={`/projects/${project.id}/settings`} className="text-[var(--accent)] hover:underline">project settings</Link>.
                </p>
              </div>

              {/* Advanced settings (collapsed) */}
              <div className="border-t border-[var(--rail)] pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] transition-colors"
                >
                  <HugeiconsIcon icon={Settings01Icon} size={13} />
                  Advanced settings
                  <span className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={10} />
                  </span>
                </button>
                {showAdvanced && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                        Dockerfile path <span className="text-[var(--text-dim)] normal-case font-normal">(overrides auto-detect)</span>
                      </label>
                      <Input
                        value={dockerfilePath}
                        onChange={e => setDockerfilePath(e.target.value)}
                        placeholder="./Dockerfile"
                        className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]"
                      />
                      <p className="text-[10px] text-[var(--text-dim)] mt-1">
                        Only set this if your project has a custom Dockerfile and you want to bypass automatic detection.
                      </p>
                    </div>

                    {sourceType === 'git' && !selectedRepo && (
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                          Credentials <span className="text-[var(--text-dim)] normal-case font-normal">(for private repos)</span>
                        </label>
                        <Input
                          value={credentials}
                          onChange={e => setCredentials(e.target.value)}
                          placeholder="Deploy key or user:token"
                          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]"
                        />
                        <p className="text-[10px] text-[var(--text-dim)] mt-1">Stored encrypted, never logged.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Build preview */}
              <BuildPreview
                sourceType={sourceType}
                gitUrl={gitUrl}
                branch={effectiveBranch}
                repoName={selectedRepo?.full_name ?? extractRepoInfo(gitUrl).repo}
                archiveName={archiveFile?.name}
                archiveSize={archiveFile?.size}
                dockerfilePath={dockerfilePath}
                envCount={Object.keys(parsedEnvVars).length}
                frameworkLabel={buildPlan?.frameworkLabel}
                frameworkVersion={buildPlan?.frameworkVersion}
                buildCommand={buildPlan?.buildCommand}
                outputDirectory={buildPlan?.outputDirectory}
                port={buildPlan?.port}
                runtime={buildPlan?.runtime}
                monorepo={buildPlan?.monorepo}
              />
            </Card>
          )}

          {/* ── Step 4: Review ── */}
          {stepIndex === 3 && (
            <Card className="border border-[var(--rail)] p-5">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Review & deploy</h2>
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
                <ReviewRow label="Framework" value={buildPlan ? `${buildPlan.frameworkLabel}${buildPlan.frameworkVersion ? ' ' + buildPlan.frameworkVersion : ''}` : 'Auto-detect'} />
                {dockerfilePath.trim() && <ReviewRow label="Dockerfile" value={dockerfilePath} mono />}
                <ReviewRow label="Env variables" value={Object.keys(parsedEnvVars).length > 0 ? `${Object.keys(parsedEnvVars).length} set` : 'None'} />
                <div className="pt-3 border-t border-[var(--rail)] mt-1">
                  <dt className="text-xs text-[var(--text-muted)] mb-1">Deployment URL (after success)</dt>
                  <dd className="text-sm font-mono text-[var(--accent)]">
                    https://{project.slug}.apps.{process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'deploy.fidscript.com'}
                  </dd>
                </div>
                {sourceType === 'git' && (
                  <div className="pt-3 border-t border-[var(--rail)] mt-1 flex items-center justify-between gap-3">
                    <div>
                      <dt className="text-xs text-[var(--text-muted)] font-medium">Auto-deploy on push</dt>
                      <dd className="text-[10px] text-[var(--text-dim)] mt-0.5">New commits to this branch will automatically trigger a deployment.</dd>
                    </div>
                    <ToggleSwitch checked={autoDeploy} onChange={setAutoDeploy} />
                  </div>
                )}
              </dl>
              <div className="mt-5 pt-4 border-t border-[var(--rail)]">
                <p className="text-xs text-[var(--text-muted)]">
                  The deployment will build and start automatically once queued. You can edit environment variables anytime in{' '}
                  <Link href={`/projects/${project.id}/settings`} className="text-[var(--accent)] hover:underline">project settings</Link>.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 inset-x-0 border-t border-[var(--rail)] bg-[var(--surface)]/95 backdrop-blur-sm">
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
  envCount?: number;
  frameworkLabel?: string;
  frameworkVersion?: string;
  buildCommand?: string;
  outputDirectory?: string;
  port?: number;
  runtime?: string;
  monorepo?: string;
}) {
  const imageName = props.sourceType === 'git'
    ? `fidscript/${props.repoName.replace('/', '-').toLowerCase()}`
    : `fidscript/archive-${Date.now().toString(36)}`;
  const tagSuffix = Date.now().toString(36);

  return (
    <div className="rounded-lg bg-[var(--surface-2)] border border-[var(--rail)] p-4 space-y-2.5">
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">What will build</p>
      <div className="flex items-start gap-2.5">
        <HugeiconsIcon icon={props.sourceType === 'git' ? GithubIcon : HardDriveIcon} size={13} className="text-[var(--text-dim)] mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-mono text-[var(--text-muted)] truncate">
            {props.sourceType === 'git' ? props.repoName : props.archiveName ?? 'archive'}
          </p>
          {props.sourceType === 'git' && <p className="text-xs text-[var(--text-dim)]">github.com/{props.repoName}</p>}
        </div>
      </div>
      {props.sourceType === 'git' && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <HugeiconsIcon icon={GitBranchIcon} size={13} className="text-[var(--text-dim)]" />
          <span className="font-mono text-[var(--text-muted)]">{props.branch || 'main'}</span>
        </div>
      )}
      {/* Detected framework */}
      {props.frameworkLabel ? (
        <div className="flex items-center gap-2 text-xs text-[var(--success)]">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
          <span className="font-mono">{props.frameworkLabel}{props.frameworkVersion ? ` ${props.frameworkVersion}` : ''}</span>
          {props.monorepo && <span className="text-[10px] text-[var(--accent)]">({props.monorepo})</span>}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <HugeiconsIcon icon={File01Icon} size={13} className="text-[var(--text-dim)]" />
          <span className="font-mono text-[var(--text-muted)]">{props.dockerfilePath ? `Dockerfile at ${props.dockerfilePath}` : 'Auto-detect'}</span>
        </div>
      )}
      {/* Build details (if detected) */}
      {props.frameworkLabel && props.buildCommand && (
        <div className="text-xs text-[var(--text-dim)] pl-5 space-y-0.5">
          {props.buildCommand && <p>Build: <span className="font-mono text-[var(--text-muted)]">{props.buildCommand}</span></p>}
          {props.outputDirectory && <p>Output: <span className="font-mono text-[var(--text-muted)]">{props.outputDirectory}</span> · Port: <span className="font-mono text-[var(--text-muted)]">{props.port}</span></p>}
        </div>
      )}
      {props.envCount != null && props.envCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-[var(--success)]">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
          <span className="font-mono">{props.envCount} env variable{props.envCount === 1 ? '' : 's'}</span>
        </div>
      )}
      <div className="border-t border-[var(--rail)] pt-2 mt-1">
        <p className="text-xs text-[var(--text-dim)] mb-1">Resulting image tag</p>
        <code className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--rail)] px-2 py-1 rounded block truncate">
          {imageName}:{(props.branch || 'archive').replace(/\//g, '-')}-{tagSuffix}
        </code>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs text-[var(--text-muted)] flex-shrink-0 pt-0.5">{label}</dt>
      <dd className={`text-sm text-[var(--text)] text-right min-w-0 truncate ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}

/** Accessible toggle switch (checkbox styled as a pill). */
function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]/40 ${
        checked ? 'bg-[var(--danger)]' : 'bg-[var(--rail-light)]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
