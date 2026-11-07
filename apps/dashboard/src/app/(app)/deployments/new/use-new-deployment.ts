'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

import { extractRepoInfo } from '@/lib/deployment-source';
import type { BuildPlan, ImportSource, Workspace } from './new-deployment-types';

interface UseNewDeploymentOptions {
  getSdk: () => FidscriptSDK;
  onShowToast: (opts: { type: string; message: string }) => void;
}

/**
 * The wizard's state — the whole deployment, from the repository to the
 * environment, before anything is built.
 *
 * The order is the operator's: a repository is chosen first, the project
 * that will hold it second, and the deployment is created last. Nothing is
 * written to the platform until the project step is confirmed.
 */
export function useNewDeployment({ getSdk, onShowToast }: UseNewDeploymentOptions) {
  const [source, setSource] = useState<ImportSource>('github');
  const [repoUrl, setRepoUrl] = useState('');
  const [repoFullName, setRepoFullName] = useState('');
  const [branch, setBranch] = useState('main');
  const [archiveFile, setArchiveFile] = useState<File | null>(null);

  // Where the project lives.
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projectName, setProjectName] = useState('');
  const [rootDirectory, setRootDirectory] = useState('');

  const [buildPlan, setBuildPlan] = useState<BuildPlan | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  /** The workspaces the person belongs to — their teams. */
  const loadWorkspaces = useCallback(async () => {
    try {
      const orgs = await getSdk().auth.organizations();
      setWorkspaces((orgs ?? []).map(o => ({ id: o.id, name: o.name, slug: o.slug })));
    } catch {
      // A platform with no organizations is not an error — the operator
      // simply has no team to choose from.
      setWorkspaces([]);
    }
  }, [getSdk]);

  /** Look at the repository and report what the platform found in it. */
  const detect = useCallback(async () => {
    if (!repoUrl) return;
    setDetecting(true);
    setBuildPlan(null);
    try {
      const plan = await getSdk().deployments.detectRepository({ gitUrl: repoUrl, branch });
      setBuildPlan(plan);
      if (plan.framework !== 'unknown') {
        onShowToast({ type: 'success', message: `Detected ${plan.frameworkLabel}` });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not read the repository';
      onShowToast({ type: 'error', message });
    } finally {
      setDetecting(false);
    }
  }, [getSdk, repoUrl, branch, onShowToast]);

  /**
   * The project's type, from what was detected.
   *
   * A framework that serves pages is a frontend; one that serves an API is a
   * backend. A Dockerfile is the operator's own business either way.
   */
  const projectType = useMemo(() => {
    const framework = buildPlan?.framework?.toLowerCase() ?? '';
    if (['next', 'vite', 'astro', 'nuxt', 'sveltekit', 'static'].includes(framework)) {
      return 'frontend';
    }
    if (framework === 'node') return 'backend';
    return 'frontend';
  }, [buildPlan]);

  /** The name the project gets when the operator has not chosen one. */
  const defaultProjectName = useMemo(() => {
    if (repoFullName) return repoFullName.split('/').pop() ?? repoFullName;
    if (archiveFile) return archiveFile.name.replace(/\.(zip|tar\.gz|tgz|tar)$/i, '');
    return '';
  }, [repoFullName, archiveFile]);

  /** Set the repository the wizard will deploy. */
  const selectRepo = useCallback((fullName: string, url: string, defaultBranch: string) => {
    setRepoFullName(fullName);
    setRepoUrl(url);
    setBranch(defaultBranch || 'main');
    const { repo } = extractRepoInfo(url);
    setProjectName((current) => current || repo.split('/').pop() || '');
  }, []);

  // An uploaded archive has no repository name, so the project is named after
  // the file — until the operator says otherwise.
  useEffect(() => {
    if (!archiveFile) return;
    setProjectName((current) => current || archiveFile.name.replace(/\.(zip|tar\.gz|tgz|tar)$/i, ''));
  }, [archiveFile]);

  return {
    source, setSource,
    repoUrl, setRepoUrl,
    repoFullName, branch, setBranch,
    archiveFile, setArchiveFile,
    workspaceId, setWorkspaceId,
    workspaces, loadWorkspaces,
    projectName, setProjectName, defaultProjectName,
    rootDirectory, setRootDirectory,
    buildPlan, detecting, detect,
    projectType,
    projectId, setProjectId,
    selectRepo,
  };
}
