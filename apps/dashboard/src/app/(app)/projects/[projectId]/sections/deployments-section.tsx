'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, GithubIcon, RefreshIcon, Rocket01Icon } from '@hugeicons/core-free-icons';
import { NewDeploymentModal } from '@/components/deployments/new-deployment-modal';
import { useToast } from '@/components/toast-provider';
import { useAuth } from '@/contexts/auth-context';
import type { Project } from '@/types';
import { DeploymentCard, DeploymentCardSkeleton } from './deployments-card';
import { useDeploymentsFetch } from './deployments-fetch';
import { isDeploymentInFlight, type DeploymentTab } from './deployments-utils';

export interface DeploymentsSectionProps { project: Project }

export function DeploymentsSectionBody({ project }: DeploymentsSectionProps) {
  const { getSdk } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const tab = (searchParams.get('tab') as DeploymentTab) ?? 'active';
  const { deployments, isLoading, error, loadDeployments, updateDeployment, removeDeployment } = useDeploymentsFetch(project.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [githubStatus, setGithubStatus] = useState<{ connected: boolean; username?: string; avatarUrl?: string } | null>(null);
  const [isGithubConnecting, setIsGithubConnecting] = useState(false);
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    void getSdk().github.status().then(setGithubStatus).catch(() => setGithubStatus({ connected: false }));
  }, [getSdk]);

  async function connectGithub() {
    setIsGithubConnecting(true);
    try {
      await getSdk().github.connect();
      setGithubStatus(await getSdk().github.status());
    } catch (connectError) {
      if (connectError instanceof Error && connectError.name === 'AuthError') return router.replace('/login');
      showToast({ type: 'error', message: connectError instanceof Error ? connectError.message : 'Failed to connect to GitHub' });
    } finally { setIsGithubConnecting(false); }
  }

  async function deployRepository(event: React.FormEvent) {
    event.preventDefault();
    if (!repositoryUrl.trim()) return;
    setIsDeploying(true);
    try {
      await getSdk().deployments.create(project.id, { source: { type: 'git', git: { url: repositoryUrl.trim() } } });
      setRepositoryUrl('');
      showToast({ type: 'success', message: 'Deployment started.' });
      await loadDeployments();
    } catch (deployError) {
      showToast({ type: 'error', message: deployError instanceof Error ? deployError.message : 'Deploy failed.' });
    } finally { setIsDeploying(false); }
  }

  const activeDeployments = deployments.filter(deployment => isDeploymentInFlight(deployment.status));
  const visibleDeployments = tab === 'active' ? activeDeployments : deployments;
  const switchTab = (nextTab: DeploymentTab) => router.replace(`/projects/${project.id}?section=deployments&tab=${nextTab}`, { scroll: false });
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex gap-1 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg p-0.5">
        {(['active', 'all'] as DeploymentTab[]).map(item => <button key={item} onClick={() => switchTab(item)} className={`px-3.5 py-1.5 text-xs rounded-md ${tab === item ? 'bg-[var(--rail)] text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>{item === 'active' ? `Active${activeDeployments.length ? ` (${activeDeployments.length})` : ''}` : `All${deployments.length ? ` (${deployments.length})` : ''}`}</button>)}
      </div>
      <div className="flex items-center gap-2"><button onClick={() => void loadDeployments()} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] px-2.5 py-1.5"><HugeiconsIcon icon={RefreshIcon} size={13} />Refresh</button><Button variant="primary" size="sm" onClick={() => githubStatus?.connected ? setIsModalOpen(true) : void connectGithub()}><HugeiconsIcon icon={githubStatus?.connected ? Rocket01Icon : GithubIcon} size={13} />{githubStatus?.connected ? 'New deployment' : 'Connect GitHub'}</Button></div>
    </div>
    {deployments.length === 0 && tab === 'active' && <Card className="border border-[var(--rail)] py-8 px-5">
      <div className="flex flex-col items-center text-center mb-5"><HugeiconsIcon icon={githubStatus?.connected ? GithubIcon : Rocket01Icon} size={18} /><p className="text-sm font-medium text-[var(--text-muted)] mt-3">{githubStatus?.connected ? 'No deployments yet' : 'Connect GitHub to deploy'}</p><p className="text-xs text-[var(--text-muted)]">{githubStatus?.connected ? 'Paste a Git URL below to deploy your first release.' : 'Connect your GitHub account to browse repos and deploy in one click.'}</p></div>
      {githubStatus?.connected ? <form onSubmit={deployRepository} className="flex gap-2.5 max-w-xl mx-auto"><input value={repositoryUrl} onChange={event => setRepositoryUrl(event.target.value)} placeholder="https://github.com/user/repo" className="flex-1 px-3.5 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--rail)] text-sm text-[var(--text)]" /><Button type="submit" variant="primary" size="sm" loading={isDeploying} disabled={!repositoryUrl.trim()}>Deploy</Button></form> : <div className="flex justify-center"><Button variant="primary" size="sm" onClick={() => void connectGithub()} loading={isGithubConnecting}><HugeiconsIcon icon={GithubIcon} size={14} />Connect GitHub</Button></div>}
    </Card>}
    {error && <Card className="border border-[var(--danger)] py-4 px-4"><p className="text-sm text-[var(--danger)]">{error}</p></Card>}
    {isLoading && deployments.length === 0 && <div className="flex flex-col gap-2">{[1, 2, 3].map(item => <DeploymentCardSkeleton key={item} />)}</div>}
    {!isLoading && deployments.length === 0 && tab === 'all' && <Card className="border border-[var(--rail)] py-8 px-4 text-center"><p className="text-sm text-[var(--text-muted)]">No deployments in this project yet.</p></Card>}
    {!isLoading && activeDeployments.length === 0 && tab === 'active' && deployments.length > 0 && <Card className="border border-[var(--rail)] py-6 px-4 text-center"><HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-[var(--success)] mx-auto" /><p className="text-sm text-[var(--text-muted)] mt-2">All deployments are idle.</p></Card>}
    {!isLoading && visibleDeployments.length > 0 && <div className="flex flex-col gap-2" role="list" aria-label="Deployments">{visibleDeployments.map(deployment => <DeploymentCard key={deployment.id} deployment={deployment} projectId={project.id} onUpdate={updateDeployment} onRemove={removeDeployment} />)}</div>}
    {isModalOpen && <NewDeploymentModal project={project} githubStatus={githubStatus} onClose={() => setIsModalOpen(false)} onCreated={loadDeployments} />}
  </div>;
}
