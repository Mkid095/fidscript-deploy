'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import type { Project } from '@/types';
import { NewDeploymentModal } from '@/components/deployments/new-deployment-modal';
import { ToastProvider, useToast } from '@/components/toast-provider';
import {
  useDeploymentsFetch,
  useGithubConnection,
  useInlineDeploy,
} from './deployments-fetch';
import { DeploymentCard, DeploymentCardSkeleton } from './deployments-card';
import { DeploymentsListHeader } from './deployments-list-header';
import { DeploymentsEmptyState } from './deployments-empty-state';
import { isDeploymentInFlight, type DeploymentTab } from './deployments-utils';

interface Props { project: Project }

function DeploymentsSectionInner({ project }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const tab = (searchParams.get('tab') as DeploymentTab) ?? 'active';
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { deployments, isLoading, error, loadDeployments, updateDeployment, removeDeployment } =
    useDeploymentsFetch(project.id);
  const { status: githubStatus, connecting: githubConnecting, connect: connectGithub } =
    useGithubConnection(project);
  const { url: repositoryUrl, setUrl: setRepositoryUrl, submitting: isDeploying, submit: deployRepository } =
    useInlineDeploy(project);

  const activeDeployments = deployments.filter(d => isDeploymentInFlight(d.status));
  const visibleDeployments = tab === 'active' ? activeDeployments : deployments;
  const allIdle = !isLoading && deployments.length > 0 && activeDeployments.length === 0;

  function switchTab(nextTab: DeploymentTab) {
    router.replace(`/projects/${project.id}?section=deployments&tab=${nextTab}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <DeploymentsListHeader
        tab={tab}
        activeCount={activeDeployments.length}
        totalCount={deployments.length}
        githubConnected={githubStatus?.connected ?? false}
        onSwitchTab={switchTab}
        onRefresh={() => void loadDeployments()}
        onNewDeployment={() => setIsModalOpen(true)}
        onConnectGithub={() => void connectGithub(showToast)}
      />

      {deployments.length === 0 && tab === 'active' && (
        <DeploymentsEmptyState
          githubConnected={githubStatus?.connected ?? false}
          githubConnecting={githubConnecting}
          repositoryUrl={repositoryUrl}
          isDeploying={isDeploying}
          onUrlChange={setRepositoryUrl}
          onDeploy={e => deployRepository(e, showToast, loadDeployments)}
          onConnectGithub={() => void connectGithub(showToast)}
        />
      )}

      {error && (
        <Card className="border border-[var(--danger)] py-4 px-4">
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </Card>
      )}

      {isLoading && deployments.length === 0 && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => <DeploymentCardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && deployments.length === 0 && tab === 'all' && (
        <Card className="border border-[var(--rail)] py-8 px-4 text-center">
          <p className="text-sm text-[var(--text-muted)]">No deployments in this project yet.</p>
        </Card>
      )}

      {allIdle && tab === 'active' && (
        <Card className="border border-[var(--rail)] py-6 px-4 text-center">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-[var(--success)] mx-auto" />
          <p className="text-sm text-[var(--text-muted)] mt-2">All deployments are idle.</p>
        </Card>
      )}

      {!isLoading && visibleDeployments.length > 0 && (
        <div className="flex flex-col gap-2" role="list" aria-label="Deployments">
          {visibleDeployments.map(d => (
            <DeploymentCard
              key={d.id}
              deployment={d}
              projectId={project.id}
              onUpdate={updateDeployment}
              onRemove={removeDeployment}
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <NewDeploymentModal
          project={project}
          githubStatus={githubStatus}
          onClose={() => setIsModalOpen(false)}
          onCreated={loadDeployments}
        />
      )}
    </div>
  );
}

export function DeploymentsSection(props: Props) {
  return (
    <ToastProvider>
      <DeploymentsSectionInner {...props} />
    </ToastProvider>
  );
}
