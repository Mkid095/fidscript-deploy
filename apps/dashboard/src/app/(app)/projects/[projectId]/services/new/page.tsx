'use client';

/**
 * New Deployment wizard — dedicated page replacing the popup modal.
 * Route: /projects/[projectId]/services/new
 * A 4-step flow with a horizontal Stepper, scrollable form, and a sticky footer.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Stepper } from '@fidscript/ui';
import type { StepperStep } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Upload02Icon,
} from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import { useProjectContext } from '@/contexts/project-context';
import { ToastProvider, useToast } from '@/components/toast-provider';
import { API_BASE_URL } from '@/lib/sdk';
import type { GithubRepo, GithubBranch, GithubStatus, BuildPlan } from './new-deploy-types';
import type { SourceType } from './new-deploy-utils';
import { STEPS, getAccessToken, parseEnvText, extractRepoInfo } from './new-deploy-utils';
import { StepSource } from './step-source';
import { StepSelect } from './step-select';
import { StepConfigure } from './step-configure';
import { StepReview } from './step-review';

const STEPS_FOR_STEPPER: StepperStep[] = STEPS.map(s => ({ label: s.label }));

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

  // Config
  const [dockerfilePath, setDockerfilePath] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [envText, setEnvText] = useState('');
  const [autoDeploy, setAutoDeploy] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Framework detection
  const [buildPlan, setBuildPlan] = useState<BuildPlan | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  // Load GitHub status
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

  const uploadArchive = useCallback(async (file: File) => {
    if (!project) return;
    setUploadingArchive(true);
    setUploadedArchive(null);
    try {
      const token = getAccessToken();
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');
      const objectKey = `deploys/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const bucketsRes = await fetch(`${API_BASE_URL}/projects/${project.id}/storage/buckets`, { headers: { Authorization: `Bearer ${token}` } });
      const bucketsData = await bucketsRes.json();
      let bucket = (bucketsData.buckets ?? []).find((b: { name: string }) => b.name === 'deploys');
      if (!bucket) {
        const createRes = await fetch(`${API_BASE_URL}/projects/${project.id}/storage/buckets`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'deploys', provider: 'internal' }),
        });
        bucket = await createRes.json();
      }
      const uploadRes = await fetch(`${API_BASE_URL}/projects/${project.id}/storage/buckets/${bucket.id}/files`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: base64, key: objectKey, originalName: file.name, mimeType: file.type || 'application/octet-stream' }),
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.message ?? `Upload failed (HTTP ${uploadRes.status})`);
      }
      setUploadedArchive({ bucketId: bucket.id, objectKey });
      showToast({ type: 'success', message: `Uploaded ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)` });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Archive upload failed' });
      setArchiveFile(null);
    } finally {
      setUploadingArchive(false);
    }
  }, [project, showToast]);

  const gitUrl = selectedRepo ? `https://github.com/${selectedRepo.full_name}.git` : manualGitUrl.trim();
  const effectiveBranch = selectedRepo ? selectedBranch : (manualGitUrl ? 'main' : '');

  const runDetection = useCallback(async () => {
    if (!project || !gitUrl || buildPlan || detecting) return;
    setDetecting(true);
    setDetectError(null);
    try {
      const plan = await getSdk().deployments.detect(project.id, {
        gitUrl, branch: effectiveBranch || 'main',
        ...(credentials.trim() && { credentials: credentials.trim() }),
      });
      setBuildPlan(plan);
    } catch (err) {
      setDetectError(err instanceof Error ? err.message : 'Detection failed');
    } finally {
      setDetecting(false);
    }
  }, [project, gitUrl, effectiveBranch, credentials, buildPlan, detecting, getSdk]);

  useEffect(() => {
    if (stepIndex === 2 && sourceType === 'git' && gitUrl && !buildPlan && !detecting) runDetection();
    if (stepIndex < 2) { setBuildPlan(null); setDetectError(null); }
  }, [stepIndex]);

  const canContinue = useMemo(() => {
    if (stepIndex === 0) return true;
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

  const parsedEnvVars = useMemo(() => parseEnvText(envText), [envText]);

  const handleDeploy = async () => {
    if (!project) return;
    setSubmitting(true);
    try {
      const sdk = getSdk();
      const envVars = Object.keys(parsedEnvVars).length > 0 ? parsedEnvVars : undefined;
      let deploymentId: string | undefined;
      if (sourceType === 'git') {
        const created = await sdk.deployments.create(project.id, {
          source: { type: 'git', git: { url: gitUrl, branch: effectiveBranch || 'main', ...(dockerfilePath.trim() && { dockerfilePath: dockerfilePath.trim() }), ...(credentials.trim() && { credentials: credentials.trim() }) } },
          branch: effectiveBranch || 'main',
          ...(envVars && { envVars }),
        });
        deploymentId = (created as { id?: string }).id;
      } else if (uploadedArchive) {
        const created = await sdk.deployments.create(project.id, {
          source: { type: 'archive', archive: { bucketId: uploadedArchive.bucketId, objectKey: uploadedArchive.objectKey, ...(dockerfilePath.trim() && { dockerfilePath: dockerfilePath.trim() }) } },
          ...(envVars && { envVars }),
        });
        deploymentId = (created as { id?: string }).id;
      }
      showToast({ type: 'success', message: 'Deployment queued — building now.' });
      if (deploymentId) router.push(`/projects/${project.id}/deployments/${deploymentId}`);
      else router.push(`/projects/${project.id}/services`);
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Deployment failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const repoName = selectedRepo?.full_name ?? extractRepoInfo(gitUrl).repo;

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-[var(--rail)]">
        <div className="max-w-2xl mx-auto">
          <Link href={`/projects/${project.id}/services`}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] transition-colors mb-3">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={12} />
            Back to services
          </Link>
          <h1 className="text-xl font-bold text-[var(--text)]">New deployment</h1>
          <p className="sm:hidden mt-2 text-xs text-[var(--text-muted)]">
            Step {stepIndex + 1} of {STEPS.length}: <span className="text-[var(--text-muted)] font-medium">{STEPS[stepIndex].label}</span>
          </p>
          <div className="hidden sm:block mt-4">
            <Stepper steps={STEPS_FOR_STEPPER} current={stepIndex} completed={completed}
              onStepClick={i => i <= Math.max(...completed, stepIndex) && setStepIndex(i)} />
          </div>
        </div>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
        <div className="max-w-2xl mx-auto space-y-5">
          {stepIndex === 0 && <StepSource sourceType={sourceType} onChange={setSourceType} />}
          {stepIndex === 1 && (
            <StepSelect
              sourceType={sourceType} githubStatus={githubStatus} repos={repos} repoPage={repoPage}
              repoHasMore={repoHasMore} repoLoading={repoLoading} repoSearch={repoSearch}
              selectedRepo={selectedRepo} branches={branches} branchLoading={branchLoading}
              selectedBranch={selectedBranch} manualGitUrl={manualGitUrl}
              archiveFile={archiveFile} uploadedArchive={uploadedArchive} uploadingArchive={uploadingArchive}
              onSelectRepo={handleSelectRepo} onClearRepo={() => { setSelectedRepo(null); setBranches([]); }}
              onLoadMoreRepos={() => loadRepos(repoPage + 1, true)} onRepoSearchChange={setRepoSearch}
              onBranchSelect={setSelectedBranch} onManualUrlChange={setManualGitUrl}
              onConnectGithub={handleConnectGithub}
              onArchiveChange={setArchiveFile} onUploadArchive={uploadArchive} onReplaceArchive={() => { setArchiveFile(null); setUploadedArchive(null); }}
              onShowToast={showToast}
            />
          )}
          {stepIndex === 2 && (
            <StepConfigure
              sourceType={sourceType} gitUrl={gitUrl} branch={effectiveBranch} repoName={repoName}
              dockerfilePath={dockerfilePath} credentials={credentials} selectedRepo={selectedRepo}
              buildPlan={buildPlan} detecting={detecting} detectError={detectError}
              envText={envText} showAdvanced={showAdvanced}
              onDockerfileChange={setDockerfilePath} onCredentialsChange={setCredentials}
              onEnvTextChange={setEnvText} onToggleAdvanced={() => setShowAdvanced(v => !v)}
              onRunDetection={runDetection} onProjectSlug={project.slug} parsedEnvVars={parsedEnvVars}
            />
          )}
          {stepIndex === 3 && (
            <StepReview
              sourceType={sourceType} gitUrl={gitUrl} selectedRepo={selectedRepo}
              effectiveBranch={effectiveBranch} archiveFile={archiveFile}
              dockerfilePath={dockerfilePath} parsedEnvVars={parsedEnvVars} buildPlan={buildPlan}
              autoDeploy={autoDeploy} onAutoDeployChange={setAutoDeploy} onProjectSlug={project.slug}
            />
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 inset-x-0 border-t border-[var(--rail)] bg-[var(--surface)]/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack} disabled={stepIndex === 0}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={13} /> Back
          </Button>
          {stepIndex < STEPS.length - 1 ? (
            <Button variant="primary" size="sm" onClick={handleContinue} disabled={!canContinue}>
              Continue <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
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
