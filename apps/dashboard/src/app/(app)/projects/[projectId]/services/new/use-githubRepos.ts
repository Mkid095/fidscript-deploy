// useGithubRepos — hook for GitHub connection, repo loading, and branch selection

import { useState, useCallback, useEffect } from 'react';
import type { GithubRepo, GithubBranch, GithubStatus } from './new-deploy-types';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import { useGithubConnect } from '@/hooks/use-github-connect';

interface UseGithubReposOptions {
  getSdk: () => FidscriptSDK;
  sourceType: 'git' | 'archive';
  onShowToast: (opts: { type: string; message: string }) => void;
}

export function useGithubRepos({ getSdk, sourceType, onShowToast }: UseGithubReposOptions) {
  const github = useGithubConnect({ getSdk, onShowToast });
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [repoPage, setRepoPage] = useState(1);
  const [repoHasMore, setRepoHasMore] = useState(false);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [branches, setBranches] = useState<GithubBranch[]>([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('main');

  const status = github.status as GithubStatus | null;

  useEffect(() => {
    if (status?.connected && sourceType === 'git' && repos.length === 0 && !repoLoading) {
      loadRepos(1, false);
    }
  }, [status, sourceType]);

  const loadRepos = useCallback(async (page: number, append: boolean) => {
    setRepoLoading(true);
    try {
      const res = await getSdk().github.listRepos(page, 30);
      const fetched = (res.repos ?? []) as GithubRepo[];
      setRepos(prev => append ? [...prev, ...fetched] : fetched);
      setRepoPage(page);
      setRepoHasMore(res.hasMore ?? false);
    } catch {
      onShowToast({ type: 'error', message: 'Failed to load repositories' });
    } finally {
      setRepoLoading(false);
    }
  }, [getSdk, onShowToast]);

  const selectRepo = useCallback(async (repo: GithubRepo) => {
    setSelectedRepo(repo);
    setSelectedBranch(repo.default_branch || 'main');
    setBranchLoading(true);
    try {
      const [owner, name] = repo.full_name.split('/');
      const res = await getSdk().github.listBranches(owner, name);
      setBranches(res as GithubBranch[]);
    } catch {
      onShowToast({ type: 'error', message: 'Failed to load branches' });
    } finally {
      setBranchLoading(false);
    }
  }, [getSdk, onShowToast]);

  const clearRepo = useCallback(() => {
    setSelectedRepo(null);
    setBranches([]);
  }, []);

  return {
    status, oauthConfigured: github.oauthConfigured,
    repos, repoPage, repoHasMore, repoLoading, repoSearch,
    selectedRepo, branches, selectedBranch, branchLoading,
    connecting: github.connecting,
    dialogOpen: github.dialogOpen,
    error: github.error,
    openDialog: github.openDialog,
    closeDialog: github.closeDialog,
    loadRepos, selectRepo, clearRepo,
    setRepoPage, setRepoSearch, setSelectedBranch,
    connect: github.connect,
    connectWithToken: github.connectWithToken,
  };
}
