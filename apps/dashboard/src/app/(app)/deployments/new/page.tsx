'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Stepper } from '@fidscript/ui';
import type { StepperStep } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import { ToastProvider, useToast } from '@/components/toast-provider';
import { useGithubRepos } from '@/app/(app)/projects/[projectId]/services/new/use-githubRepos';
import { StepImport } from './step-import';
import { StepProject } from './step-project';
import { StepReview } from './step-review';
import { useNewDeployment } from './use-new-deployment';
import { useEnvVars } from './use-env-vars';
import { uploadArchive } from '@/lib/archive-upload';

const STEPS: StepperStep[] = [
  { label: 'Import' },
  { label: 'Project' },
  { label: 'Deploy' },
];

/**
 * The deployment wizard, starting from the platform.
 *
 * This is the flow an operator follows when they have code and no project:
 * connect the account the code lives in, choose the repository, say where
 * the project should live and what it needs, and deploy. The project is
 * created on the way — it is part of the deployment, not a prerequisite for
 * it.
 */
export default function NewDeploymentPage() {
  return (
    <ToastProvider>
      <NewDeploymentWizard />
    </ToastProvider>
  );
}

function NewDeploymentWizard() {
  const router = useRouter();
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [projectId, setProjectId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('My workspace');
  const [archiveUpload, setArchiveUpload] = useState<{ bucketId: string; objectKey: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const toast = (opts: { type: string; message: string }) =>
    showToast({ type: opts.type as 'success' | 'error' | 'info' | 'warning', message: opts.message });

  const wizard = useNewDeployment({ getSdk, onShowToast: toast });
  const env = useEnvVars();
  const github = useGithubRepos({
    getSdk,
    sourceType: wizard.source === 'archive' ? 'archive' : 'git',
    onShowToast: toast,
  });

  useEffect(() => {
    wizard.loadWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The repository the operator picked becomes the source of the deployment.
  useEffect(() => {
    if (!github.selectedRepo) return;
    wizard.selectRepo(
      github.selectedRepo.full_name,
      `https://github.com/${github.selectedRepo.full_name}.git`,
      github.selectedBranch,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [github.selectedRepo?.full_name, github.selectedBranch]);

  // Reading the repository is what turns "a repository" into "an application".
  useEffect(() => {
    if (!wizard.repoUrl) return;
    if (wizard.source !== 'github' && wizard.source !== 'git') return;
    wizard.detect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizard.repoUrl, wizard.branch]);

  async function handleCreateProject(): Promise<void> {
    if (!wizard.projectName.trim()) {
      toast({ type: 'error', message: 'Give the project a name' });
      return;
    }
    setCompleted(prev => new Set(prev).add(0));
    setBusy(true);
    try {
      const project = await getSdk().projects.create({
        name: wizard.projectName.trim(),
        type: wizard.projectType,
        ...(wizard.workspaceId ? { organizationId: wizard.workspaceId } : {}),
      });
      setProjectId(project.id);
      wizard.setProjectId(project.id);

      // The build configuration is part of the project: which folder holds
      // the application, and which variables the build cannot do without.
      await getSdk().deployments.updateBuildConfig(project.id, {
        ...(wizard.rootDirectory.trim() ? { buildTarget: wizard.rootDirectory.trim() } : {}),
        ...(env.requiredEnvVarNames.length ? { requiredEnvVars: env.requiredEnvVarNames } : {}),
      });

      const workspace = wizard.workspaces.find(w => w.id === wizard.workspaceId);
      setWorkspaceName(workspace ? workspace.name : 'My workspace');

      // An archive is uploaded into the project's own storage, so it can
      // only happen now that the project exists.
      if (wizard.source === 'archive' && wizard.archiveFile) {
        const uploaded = await uploadArchive(getSdk(), project.id, wizard.archiveFile);
        setArchiveUpload(uploaded);
      }

      setCompleted(prev => new Set(prev).add(1));
      setStep(2);
    } catch (err) {
      toast({ type: 'error', message: err instanceof Error ? err.message : 'Could not create the project' });
    } finally {
      setBusy(false);
    }
  }

  async function handleDeploy(): Promise<void> {
    if (!projectId) return;
    setBusy(true);
    try {
      const deployment = await getSdk().deployments.create(projectId, {
        source: wizard.source === 'archive' && archiveUpload
          ? { type: 'archive', archive: { bucketId: archiveUpload.bucketId, objectKey: archiveUpload.objectKey } }
          : { type: 'git', git: { url: wizard.repoUrl, branch: wizard.branch } },
        branch: wizard.branch,
        envVars: env.envVarsRecord,
      });
      router.push(`/projects/${projectId}/deployments/${deployment.id}`);
    } catch (err) {
      toast({ type: 'error', message: err instanceof Error ? err.message : 'The deployment could not be started' });
    } finally {
      setBusy(false);
    }
  }

  const canContinue =
    step === 0
      ? wizard.source === 'github'
        ? !!github.selectedRepo
        : wizard.source === 'git'
          ? !!wizard.repoUrl.trim()
          : !!wizard.archiveFile
      : !!wizard.projectName.trim();

  return (
    <div className="min-h-full flex flex-col">
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-[var(--rail)]">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-3"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={12} /> Back to projects
          </Link>
          <h1 className="text-xl font-bold text-[var(--text)]">New deployment</h1>
          <div className="hidden sm:block mt-4">
            <Stepper steps={STEPS} current={step} completed={completed} onStepClick={i => i < step && setStep(i)} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
        <div className="max-w-2xl mx-auto">
          {step === 0 && (
            <StepImport
              source={wizard.source}
              onSourceChange={wizard.setSource}
              githubStatus={github.status}
              repos={github.repos}
              repoHasMore={github.repoHasMore}
              repoLoading={github.repoLoading}
              repoSearch={github.repoSearch}
              selectedRepo={github.selectedRepo}
              branches={github.branches}
              branchLoading={github.branchLoading}
              selectedBranch={github.selectedBranch}
              onConnectGithub={github.connect}
              onSelectRepo={github.selectRepo}
              onClearRepo={github.clearRepo}
              onLoadMoreRepos={() => github.loadRepos(github.repoPage + 1, true)}
              onRepoSearchChange={github.setRepoSearch}
              onBranchSelect={(b: string) => {
                github.setSelectedBranch(b);
                wizard.setBranch(b);
              }}
              manualGitUrl={wizard.repoUrl}
              onManualGitUrlChange={wizard.setRepoUrl}
              archiveFile={wizard.archiveFile}
              onArchiveChange={wizard.setArchiveFile}
            />
          )}

          {step === 1 && (
            <StepProject
              source={wizard.source}
              repoFullName={wizard.repoFullName}
              branch={wizard.branch}
              workspaces={wizard.workspaces}
              workspaceId={wizard.workspaceId}
              onWorkspaceChange={wizard.setWorkspaceId}
              projectName={wizard.projectName}
              onProjectNameChange={wizard.setProjectName}
              rootDirectory={wizard.rootDirectory}
              onRootDirectoryChange={wizard.setRootDirectory}
              buildPlan={wizard.buildPlan}
              detecting={wizard.detecting}
              onDetect={wizard.detect}
              envVars={env.envVars}
              onEnvAdd={env.addVar}
              onEnvUpdate={env.updateVar}
              onEnvRemove={env.removeVar}
              onEnvPaste={env.loadEnvText}
            />
          )}

          {step === 2 && (
            <StepReview
              source={wizard.source}
              repoFullName={wizard.repoFullName}
              branch={wizard.branch}
              projectName={wizard.projectName}
              workspaceName={workspaceName}
              rootDirectory={wizard.rootDirectory}
              buildPlan={wizard.buildPlan}
              envVars={env.envVars}
              projectId={projectId ?? ''}
            />
          )}
        </div>
      </div>

      <div className="border-t border-[var(--rail)] bg-[var(--surface-2)] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          {step < 2 ? (
            <Button
              variant="primary"
              onClick={() => (step === 0 ? setStep(1) : handleCreateProject())}
              disabled={!canContinue || busy}
              loading={busy}
            >
              {step === 0 ? 'Continue' : 'Create the project'}
            </Button>
          ) : (
            <Button variant="primary" onClick={handleDeploy} disabled={!projectId} loading={busy}>
              Deploy
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
