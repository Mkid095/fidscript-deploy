'use client';

/**
 * New Deployment wizard — dedicated page replacing the popup modal.
 * Route: /projects/[projectId]/services/new
 * A 4-step flow with a horizontal Stepper, scrollable form, and a sticky footer.
 */
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Stepper } from '@fidscript/ui';
import type { StepperStep } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, ArrowRight01Icon, Upload02Icon } from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import { useProjectContext } from '@/contexts/project-context';
import { ToastProvider, useToast } from '@/components/toast-provider';
import { STEPS } from './new-deploy-utils';
import { StepSource } from './step-source';
import { StepSelect } from './step-select';
import { StepConfigure } from './step-configure';
import { StepReview } from './step-review';
import { useNewDeploy } from './use-new-deploy';
import { useGithubRepos } from './use-githubRepos';
import { useArchiveUpload } from './use-archive-upload';

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

  const handleDeploySuccess = (deploymentId?: string) => {
    if (deploymentId) router.push(`/projects/${project.id}/deployments/${deploymentId}`);
    else router.push(`/projects/${project.id}/services`);
  };

  const newDeploy = useNewDeploy({ project, getSdk, onShowToast: showToast, onDeploySuccess: handleDeploySuccess });
  const github = useGithubRepos({ getSdk, sourceType: newDeploy.sourceType, onShowToast: showToast });
  const archive = useArchiveUpload({ project, onShowToast: showToast });

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-[var(--rail)]">
        <div className="max-w-2xl mx-auto">
          <Link href={`/projects/${project.id}/services`}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] transition-colors mb-3">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={12} /> Back to services
          </Link>
          <h1 className="text-xl font-bold text-[var(--text)]">New deployment</h1>
          <p className="sm:hidden mt-2 text-xs text-[var(--text-muted)]">
            Step {newDeploy.stepIndex + 1} of {STEPS.length}: <span className="font-medium">{STEPS[newDeploy.stepIndex].label}</span>
          </p>
          <div className="hidden sm:block mt-4">
            <Stepper steps={STEPS_FOR_STEPPER} current={newDeploy.stepIndex} completed={newDeploy.completed}
              onStepClick={i => i <= Math.max(...newDeploy.completed, newDeploy.stepIndex) && newDeploy.continue()} />
          </div>
        </div>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
        <div className="max-w-2xl mx-auto space-y-5">
          {newDeploy.stepIndex === 0 && (
            <StepSource sourceType={newDeploy.sourceType} onChange={newDeploy.setSourceType} />
          )}
          {newDeploy.stepIndex === 1 && (
            <StepSelect
              sourceType={newDeploy.sourceType}
              githubStatus={github.status}
              repos={github.repos}
              repoPage={github.repoPage}
              repoHasMore={github.repoHasMore}
              repoLoading={github.repoLoading}
              repoSearch={github.repoSearch}
              selectedRepo={github.selectedRepo}
              branches={github.branches}
              branchLoading={github.branchLoading}
              selectedBranch={github.selectedBranch}
              manualGitUrl={newDeploy.manualGitUrl}
              archiveFile={archive.archiveFile}
              uploadedArchive={archive.uploadedArchive}
              uploadingArchive={archive.uploadingArchive}
              onSelectRepo={github.selectRepo}
              onClearRepo={github.clearRepo}
              onLoadMoreRepos={() => github.loadRepos(github.repoPage + 1, true)}
              onRepoSearchChange={github.setRepoSearch}
              onBranchSelect={github.setSelectedBranch}
              onManualUrlChange={newDeploy.setManualGitUrl}
              onConnectGithub={github.connect}
              onArchiveChange={archive.setArchiveFile}
              onUploadArchive={archive.uploadArchive}
              onReplaceArchive={archive.replaceArchive}
              onShowToast={showToast ?? (() => {})}
            />
          )}
          {newDeploy.stepIndex === 2 && (
            <StepConfigure
              sourceType={newDeploy.sourceType}
              gitUrl={newDeploy.gitUrl}
              branch={newDeploy.effectiveBranch}
              repoName={newDeploy.repoName}
              dockerfilePath={newDeploy.dockerfilePath}
              credentials={newDeploy.credentials}
              selectedRepo={github.selectedRepo}
              buildPlan={newDeploy.buildPlan}
              detecting={newDeploy.detecting}
              detectError={newDeploy.detectError}
              envText={newDeploy.envText}
              showAdvanced={newDeploy.showAdvanced}
              onDockerfileChange={newDeploy.setDockerfilePath}
              onCredentialsChange={newDeploy.setCredentials}
              onEnvTextChange={newDeploy.setEnvText}
              onToggleAdvanced={() => newDeploy.setShowAdvanced(v => !v)}
              onRunDetection={newDeploy.runDetection}
              onProjectSlug={project.slug}
              parsedEnvVars={newDeploy.parsedEnvVars}
            />
          )}
          {newDeploy.stepIndex === 3 && (
            <StepReview
              sourceType={newDeploy.sourceType}
              gitUrl={newDeploy.gitUrl}
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

      {/* Sticky footer */}
      <div className="fixed bottom-0 inset-x-0 border-t border-[var(--rail)] bg-[var(--surface)]/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={newDeploy.back} disabled={newDeploy.stepIndex === 0}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={13} /> Back
          </Button>
          {newDeploy.stepIndex < STEPS.length - 1 ? (
            <Button variant="primary" size="sm" onClick={newDeploy.continue} disabled={!newDeploy.canContinue}>
              Continue <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={newDeploy.deploy} loading={newDeploy.submitting} disabled={!newDeploy.canContinue}>
              <HugeiconsIcon icon={Upload02Icon} size={13} />
              {newDeploy.submitting ? 'Deploying…' : 'Deploy'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
