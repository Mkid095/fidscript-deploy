'use client';

import { useState } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

import { uploadArchive } from '@/lib/archive-upload';

interface UseDeploymentFlowOptions {
  getSdk: () => FidscriptSDK;
  projectName: string;
  projectType: string;
  workspaceId: string;
  rootDirectory: string;
  requiredEnvVarNames: string[];
  envVars: Record<string, string>;
  source: 'github' | 'git' | 'archive';
  repoUrl: string;
  branch: string;
  archiveFile: File | null;
  onShowToast: (opts: { type: string; message: string }) => void;
}

export interface DeploymentFlow {
  busy: boolean;
  projectId: string | null;
  workspaceName: string;
  setWorkspaceName: (name: string) => void;
  createProject: () => Promise<void>;
  deploy: () => Promise<string | null>;
}

/**
 * The two things the wizard writes to the platform.
 *
 * The project is created first — it is part of the deployment, not a
 * prerequisite for it — and the deployment is created second, carrying the
 * environment variables the operator entered. Both are the platform's own
 * calls: the wizard writes nothing of its own.
 */
export function useDeploymentFlow(options: UseDeploymentFlowOptions): DeploymentFlow {
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('My workspace');
  const [archiveUpload, setArchiveUpload] = useState<{ bucketId: string; objectKey: string } | null>(null);

  async function createProject(): Promise<void> {
    if (!options.projectName.trim()) {
      options.onShowToast({ type: 'error', message: 'Give the project a name' });
      return;
    }
    setBusy(true);
    try {
      const project = await options.getSdk().projects.create({
        name: options.projectName.trim(),
        type: options.projectType,
        ...(options.workspaceId ? { organizationId: options.workspaceId } : {}),
      });
      setProjectId(project.id);

      // The build configuration is part of the project: which folder holds
      // the application, and which variables the build cannot do without.
      await options.getSdk().deployments.updateBuildConfig(project.id, {
        ...(options.rootDirectory.trim() ? { buildTarget: options.rootDirectory.trim() } : {}),
        ...(options.requiredEnvVarNames.length ? { requiredEnvVars: options.requiredEnvVarNames } : {}),
      });

      // An archive is uploaded into the project's own storage, so it can
      // only happen now that the project exists.
      if (options.source === 'archive' && options.archiveFile) {
        setArchiveUpload(await uploadArchive(options.getSdk(), project.id, options.archiveFile));
      }
    } catch (err) {
      options.onShowToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not create the project',
      });
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function deploy(): Promise<string | null> {
    if (!projectId) return null;
    setBusy(true);
    try {
      const deployment = await options.getSdk().deployments.create(projectId, {
        source:
          options.source === 'archive' && archiveUpload
            ? { type: 'archive', archive: { bucketId: archiveUpload.bucketId, objectKey: archiveUpload.objectKey } }
            : { type: 'git', git: { url: options.repoUrl, branch: options.branch } },
        branch: options.branch,
        envVars: options.envVars,
      });
      return deployment.id;
    } catch (err) {
      options.onShowToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'The deployment could not be started',
      });
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { busy, projectId, workspaceName, setWorkspaceName, createProject, deploy };
}
