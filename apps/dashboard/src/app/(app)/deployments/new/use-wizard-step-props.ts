'use client';

import type { WizardStepProps } from './wizard-steps';
import type { useNewDeployment } from './use-new-deployment';
import type { useEnvVars } from './use-env-vars';
import type { useGithubRepos } from '@/app/(app)/projects/[projectId]/services/new/use-githubRepos';
import type { useDeploymentFlow } from './use-deployment-flow';

type Wizard = ReturnType<typeof useNewDeployment>;
type Env = ReturnType<typeof useEnvVars>;
type Github = ReturnType<typeof useGithubRepos>;
type Flow = ReturnType<typeof useDeploymentFlow>;

/**
 * What the current step needs, gathered in one place.
 *
 * The step components take their props one by one; this is where they are
 * put together, so the wizard's own page reads as a flow rather than as a
 * list of two dozen props.
 */
export function useWizardStepProps({
  step,
  wizard,
  env,
  github,
  flow,
}: {
  step: number;
  wizard: Wizard;
  env: Env;
  github: Github;
  flow: Flow;
}): WizardStepProps {
  return {
    step,
    source: wizard.source,
    onSourceChange: wizard.setSource,
    githubStatus: github.status,
    repos: github.repos,
    repoHasMore: github.repoHasMore,
    repoLoading: github.repoLoading,
    repoSearch: github.repoSearch,
    selectedRepo: github.selectedRepo,
    branches: github.branches,
    branchLoading: github.branchLoading,
    selectedBranch: github.selectedBranch,
    onOpenGithubDialog: github.openDialog,
    githubOauthConfigured: github.oauthConfigured,
    onSelectRepo: github.selectRepo,
    onClearRepo: github.clearRepo,
    onLoadMoreRepos: () => github.loadRepos(github.repoPage + 1, true),
    onRepoSearchChange: github.setRepoSearch,
    onBranchSelect: (b: string) => {
      github.setSelectedBranch(b);
      wizard.setBranch(b);
    },
    manualGitUrl: wizard.repoUrl,
    onManualGitUrlChange: wizard.setRepoUrl,
    archiveFile: wizard.archiveFile,
    onArchiveChange: wizard.setArchiveFile,
    workspaces: wizard.workspaces,
    workspaceId: wizard.workspaceId,
    onWorkspaceChange: wizard.setWorkspaceId,
    projectName: wizard.projectName,
    onProjectNameChange: wizard.setProjectName,
    rootDirectory: wizard.rootDirectory,
    onRootDirectoryChange: wizard.setRootDirectory,
    buildPlan: wizard.buildPlan,
    detecting: wizard.detecting,
    onDetect: wizard.detect,
    envVars: env.envVars,
    onEnvAdd: env.addVar,
    onEnvUpdate: env.updateVar,
    onEnvRemove: env.removeVar,
    onEnvPaste: env.loadEnvText,
    repoFullName: wizard.repoFullName,
    branch: wizard.branch,
    workspaceName: flow.workspaceName,
    projectId: flow.projectId ?? '',
  };
}
