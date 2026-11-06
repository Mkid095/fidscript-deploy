'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';
import { useGithubRepos } from '@/app/(app)/projects/[projectId]/services/new/use-githubRepos';
import { GithubConnectDialog } from '@/components/github/github-connect-dialog';
import { WizardHeader } from './wizard-header';
import { WizardSteps } from './wizard-steps';
import { WizardFooter } from './wizard-footer';
import { useNewDeployment } from './use-new-deployment';
import { useEnvVars } from './use-env-vars';
import { useDeploymentFlow } from './use-deployment-flow';
import { useWizardStepProps } from './use-wizard-step-props';

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
    <NewDeploymentWizard />
  );
}

function NewDeploymentWizard() {
  const router = useRouter();
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const toast = (opts: { type: string; message: string }) =>
    showToast({ type: opts.type as 'success' | 'error' | 'info' | 'warning', message: opts.message });

  const wizard = useNewDeployment({ getSdk, onShowToast: toast });
  const env = useEnvVars();
  const github = useGithubRepos({
    getSdk,
    sourceType: wizard.source === 'archive' ? 'archive' : 'git',
    onShowToast: toast,
  });

  const flow = useDeploymentFlow({
    getSdk,
    projectName: wizard.projectName,
    projectType: wizard.projectType,
    workspaceId: wizard.workspaceId,
    rootDirectory: wizard.rootDirectory,
    requiredEnvVarNames: env.requiredEnvVarNames,
    envVars: env.envVarsRecord,
    source: wizard.source,
    repoUrl: wizard.repoUrl,
    branch: wizard.branch,
    archiveFile: wizard.archiveFile,
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
    try {
      await flow.createProject();
    } catch {
      return; // The failure is already on screen.
    }
    const workspace = wizard.workspaces.find(w => w.id === wizard.workspaceId);
    flow.setWorkspaceName(workspace ? workspace.name : 'My workspace');
    setCompleted(prev => new Set(prev).add(0));
    setCompleted(prev => new Set(prev).add(1));
    setStep(2);
  }

  async function handleDeploy(): Promise<void> {
    const deploymentId = await flow.deploy();
    if (!deploymentId || !flow.projectId) return;
    router.push(`/projects/${flow.projectId}/deployments/${deploymentId}`);
  }

  const stepProps = useWizardStepProps({ step, wizard, env, github, flow });

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
      <WizardHeader
        step={step}
        completed={completed}
        onStepClick={i => i < step && setStep(i)}
      />

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
        <div className="max-w-2xl mx-auto">
          <WizardSteps {...stepProps} />
        </div>
      </div>

      <GithubConnectDialog
        isOpen={github.dialogOpen}
        onClose={github.closeDialog}
        oauthConfigured={github.oauthConfigured}
        connecting={github.connecting}
        error={github.error}
        onSignInWithGithub={() => void github.connect()}
        onSubmitToken={github.connectWithToken}
      />

      <WizardFooter
        step={step}
        canContinue={canContinue}
        busy={flow.busy}
        onBack={() => setStep(s => Math.max(0, s - 1))}
        onContinue={() => (step === 0 ? setStep(1) : handleCreateProject())}
        onDeploy={handleDeploy}
      />
    </div>
  );
}
