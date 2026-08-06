'use client';

/**
 * New Deployment wizard — dedicated page replacing the popup modal.
 * Route: /projects/[projectId]/services/new
 * A 4-step flow with a horizontal Stepper, scrollable form, and a sticky footer.
 */
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { useProjectContext } from '@/contexts/project-context';
import { ToastProvider, useToast } from '@/components/toast-provider';
import { WizardHeader } from './wizard-header';
import { WizardFooter } from './wizard-footer';
import { StepSource } from './step-source';
import { StepSelect } from './step-select';
import { StepConfigure } from './step-configure';
import { StepReview } from './step-review';
import { useNewDeploy } from './use-new-deploy';
import { useGithubRepos } from './use-githubRepos';
import { useArchiveUpload } from './use-archive-upload';

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

  const handleDeploySuccess = (deploymentId?: string) => {
    if (deploymentId) router.push(`/projects/${project.id}/deployments/${deploymentId}`);
    else router.push(`/projects/${project.id}/services`);
  };

  const toastAdapter = (opts: { type: string; message: string }) => showToast({ type: opts.type as 'success' | 'error' | 'info' | 'warning', message: opts.message });
  const newDeploy = useNewDeploy({ project, getSdk, onShowToast: toastAdapter, onDeploySuccess: handleDeploySuccess });
  const github = useGithubRepos({ getSdk, sourceType: newDeploy.sourceType, onShowToast: toastAdapter });
  const archive = useArchiveUpload({ project, onShowToast: toastAdapter });

  function handleStepClick(i: number) {
    if (i <= Math.max(...newDeploy.completed, newDeploy.stepIndex)) newDeploy.continueStep();
  }

  return (
    <div className="min-h-full flex flex-col">
      <WizardHeader
        projectId={project.id}
        stepIndex={newDeploy.stepIndex}
        completed={newDeploy.completed}
        onStepClick={handleStepClick}
      />

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
        <div className="max-w-2xl mx-auto space-y-5">
          {newDeploy.stepIndex === 0 && (
            <StepSource sourceType={newDeploy.sourceType} onChange={newDeploy.setSourceType} />
          )}
          {newDeploy.stepIndex === 1 && (
            <StepSelect
              sourceType={newDeploy.sourceType} githubStatus={github.status}
              repos={github.repos} repoPage={github.repoPage} repoHasMore={github.repoHasMore}
              repoLoading={github.repoLoading} repoSearch={github.repoSearch}
              selectedRepo={github.selectedRepo} branches={github.branches}
              branchLoading={github.branchLoading} selectedBranch={github.selectedBranch}
              manualGitUrl={newDeploy.manualGitUrl}
              archiveFile={archive.archiveFile} uploadedArchive={archive.uploadedArchive}
              uploadingArchive={archive.uploadingArchive}
              onSelectRepo={github.selectRepo} onClearRepo={github.clearRepo}
              onLoadMoreRepos={() => github.loadRepos(github.repoPage + 1, true)}
              onRepoSearchChange={github.setRepoSearch} onBranchSelect={github.setSelectedBranch}
              onManualUrlChange={newDeploy.setManualGitUrl}
              onConnectGithub={github.connect}
              onArchiveChange={archive.setArchiveFile}
              onUploadArchive={archive.uploadArchive}
              onReplaceArchive={archive.replaceArchive}
              onShowToast={toastAdapter}
            />
          )}
          {newDeploy.stepIndex === 2 && (
            <StepConfigure
              sourceType={newDeploy.sourceType} gitUrl={newDeploy.gitUrl}
              branch={newDeploy.effectiveBranch} repoName={newDeploy.repoName}
              dockerfilePath={newDeploy.dockerfilePath} credentials={newDeploy.credentials}
              selectedRepo={github.selectedRepo} buildPlan={newDeploy.buildPlan}
              detecting={newDeploy.detecting} detectError={newDeploy.detectError}
              envText={newDeploy.envText} showAdvanced={newDeploy.showAdvanced}
              subdomain={newDeploy.subdomain}
              platformDomain={process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'deploy.fidscript.com'}
              availableDomains={newDeploy.availableDomains}
              onDockerfileChange={newDeploy.setDockerfilePath}
              onCredentialsChange={newDeploy.setCredentials}
              onEnvTextChange={newDeploy.setEnvText}
              onToggleAdvanced={() => newDeploy.setShowAdvanced(v => !v)}
              onRunDetection={newDeploy.runDetection}
              onSubdomainChange={newDeploy.setSubdomain}
              onAssignExistingDomain={(id) => newDeploy.setAssignedDomainId(id)}
              onProjectSlug={project.slug}
              parsedEnvVars={newDeploy.parsedEnvVars}
            />
          )}
          {newDeploy.stepIndex === 3 && (
            <StepReview
              sourceType={newDeploy.sourceType} gitUrl={newDeploy.gitUrl}
              selectedRepo={github.selectedRepo}
              effectiveBranch={newDeploy.effectiveBranch}
              archiveFile={archive.archiveFile}
              dockerfilePath={newDeploy.dockerfilePath}
              parsedEnvVars={newDeploy.parsedEnvVars}
              buildPlan={newDeploy.buildPlan}
              autoDeploy={newDeploy.autoDeploy}
              onAutoDeployChange={newDeploy.setAutoDeploy}
              onProjectSlug={project.slug}
            />
          )}
        </div>
      </div>

      <WizardFooter
        stepIndex={newDeploy.stepIndex}
        canContinue={newDeploy.canContinue}
        submitting={newDeploy.submitting}
        onBack={newDeploy.back}
        onContinue={newDeploy.continueStep}
        onDeploy={newDeploy.deploy}
      />
    </div>
  );
}
