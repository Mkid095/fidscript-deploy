'use client';

import { Card, Input } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, GitBranchIcon, GithubIcon } from '@hugeicons/core-free-icons';

import { EnvVarsEditor } from './env-vars-editor';
import { WorkspacePicker } from './workspace-picker';
import type { BuildPlan, EnvVarEntry, ImportSource, Workspace } from './new-deployment-types';

interface StepProjectProps {
  source: ImportSource;
  repoFullName: string;
  branch: string;

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
}

/**
 * Step two — the project the deployment belongs to.
 *
 * It is one form because it is one decision: where the code lives, what the
 * project is called, which folder holds the application, what the platform
 * found in it, and what the application needs to run.
 */
export function StepProject(props: StepProjectProps) {
  return (
    <div className="space-y-5">
      <Card className="border border-[var(--rail)] p-5">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
          The source
        </p>
        <div className="flex items-center gap-2 text-sm text-[var(--text)]">
          {props.source === 'github' ? (
            <HugeiconsIcon icon={GithubIcon} size={14} className="text-[var(--text-muted)]" />
          ) : (
            <HugeiconsIcon icon={GitBranchIcon} size={14} className="text-[var(--text-muted)]" />
          )}
          <span className="font-mono truncate">{props.repoFullName || 'The code you imported'}</span>
          <HugeiconsIcon icon={GitBranchIcon} size={13} className="text-[var(--text-dim)]" />
          <span className="font-mono text-[var(--text-muted)]">{props.branch}</span>
        </div>
      </Card>

      <Card className="border border-[var(--rail)] p-5 space-y-4">
        <WorkspacePicker
          workspaces={props.workspaces}
          workspaceId={props.workspaceId}
          onWorkspaceChange={props.onWorkspaceChange}
        />

        <Input
          label="Project name"
          value={props.projectName}
          onChange={e => props.onProjectNameChange(e.target.value)}
          placeholder="my-app"
        />

        <Input
          label="Root directory"
          value={props.rootDirectory}
          onChange={e => props.onRootDirectoryChange(e.target.value)}
          placeholder="Leave empty when the application is at the top of the repository"
        />
      </Card>

      <Card className="border border-[var(--rail)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Application preset</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              What the platform found in the code, and how it will build it.
            </p>
          </div>
          <button
            type="button"
            onClick={props.onDetect}
            disabled={props.detecting}
            className="text-xs text-[var(--accent)] hover:underline disabled:opacity-50"
          >
            {props.detecting ? 'Reading…' : 'Detect again'}
          </button>
        </div>
        {props.buildPlan ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="text-[var(--success)]" />
              <span className="text-[var(--text)] font-medium">{props.buildPlan.frameworkLabel}</span>
              {props.buildPlan.frameworkVersion && (
                <span className="text-xs text-[var(--text-muted)]">{props.buildPlan.frameworkVersion}</span>
              )}
              {props.buildPlan.monorepo && (
                <span className="text-[10px] text-[var(--accent)]">({props.buildPlan.monorepo})</span>
              )}
            </div>
            {props.buildPlan.buildCommand && (
              <p className="text-xs text-[var(--text-muted)] font-mono pl-6">
                Build: {props.buildPlan.buildCommand}
              </p>
            )}
            {props.buildPlan.port != null && (
              <p className="text-xs text-[var(--text-muted)] font-mono pl-6">
                Listens on port {props.buildPlan.port}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">
            {props.detecting
              ? 'Reading the repository…'
              : props.source === 'archive'
                ? 'The preset is worked out from the archive when it is built.'
                : 'Nothing detected yet.'}
          </p>
        )}
      </Card>

      <Card className="border border-[var(--rail)] p-5">
        <EnvVarsEditor
          envVars={props.envVars}
          onAdd={props.onEnvAdd}
          onUpdate={props.onEnvUpdate}
          onRemove={props.onEnvRemove}
          onPasteEnv={props.onEnvPaste}
        />
      </Card>
    </div>
  );
}
