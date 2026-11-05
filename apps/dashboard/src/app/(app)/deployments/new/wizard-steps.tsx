'use client';

import { StepImport } from './step-import';
import { StepProject } from './step-project';
import { StepReview } from './step-review';
import type {
  BuildPlan,
  EnvVarEntry,
  GithubBranch,
  GithubRepo,
  GithubStatus,
  ImportSource,
  Workspace,
} from './new-deployment-types';

/**
 * The three steps of the wizard.
 *
 * Each one is a separate component with its own props, because a step that
 * knows about the whole wizard is a step nobody can change.
 */
export interface WizardStepProps {
  step: number;

  // The import step.
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

  // The project step.
  workspaces: Workspace[];
  workspaceId: string;
  onWorkspaceChange: (id: string) => void;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  rootDirectory: string;
  onRootDirectoryChange: (value: string) => void;
  buildPlan: BuildPlan | null;
  detecting: boolean;
  onDetect: () => void;
  envVars: EnvVarEntry[];
  onEnvAdd: () => void;
  onEnvUpdate: (index: number, patch: Partial<EnvVarEntry>) => void;
  onEnvRemove: (index: number) => void;
  onEnvPaste: (text: string) => void;

  // The review step.
  repoFullName: string;
  branch: string;
  workspaceName: string;
  projectId: string;
}

export function WizardSteps(props: WizardStepProps) {
  if (props.step === 0) {
    return (
      <StepImport
        source={props.source}
        onSourceChange={props.onSourceChange}
        githubStatus={props.githubStatus}
        repos={props.repos}
        repoHasMore={props.repoHasMore}
        repoLoading={props.repoLoading}
        repoSearch={props.repoSearch}
        selectedRepo={props.selectedRepo}
        branches={props.branches}
        branchLoading={props.branchLoading}
        selectedBranch={props.selectedBranch}
        onConnectGithub={props.onConnectGithub}
        onSelectRepo={props.onSelectRepo}
        onClearRepo={props.onClearRepo}
        onLoadMoreRepos={props.onLoadMoreRepos}
        onRepoSearchChange={props.onRepoSearchChange}
        onBranchSelect={props.onBranchSelect}
        manualGitUrl={props.manualGitUrl}
        onManualGitUrlChange={props.onManualGitUrlChange}
        archiveFile={props.archiveFile}
        onArchiveChange={props.onArchiveChange}
      />
    );
  }

  if (props.step === 1) {
    return (
      <StepProject
        source={props.source}
        repoFullName={props.repoFullName}
        branch={props.branch}
        workspaces={props.workspaces}
        workspaceId={props.workspaceId}
        onWorkspaceChange={props.onWorkspaceChange}
        projectName={props.projectName}
        onProjectNameChange={props.onProjectNameChange}
        rootDirectory={props.rootDirectory}
        onRootDirectoryChange={props.onRootDirectoryChange}
        buildPlan={props.buildPlan}
        detecting={props.detecting}
        onDetect={props.onDetect}
        envVars={props.envVars}
        onEnvAdd={props.onEnvAdd}
        onEnvUpdate={props.onEnvUpdate}
        onEnvRemove={props.onEnvRemove}
        onEnvPaste={props.onEnvPaste}
      />
    );
  }

  return (
    <StepReview
      source={props.source}
      repoFullName={props.repoFullName}
      branch={props.branch}
      projectName={props.projectName}
      workspaceName={props.workspaceName}
      rootDirectory={props.rootDirectory}
      buildPlan={props.buildPlan}
      envVars={props.envVars}
      projectId={props.projectId}
    />
  );
}
