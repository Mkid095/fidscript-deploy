// Services page body — error, loading, empty, or grid

import { useRouter } from 'next/navigation';
import { Card, Button, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Rocket01Icon, GithubIcon } from '@hugeicons/core-free-icons';

import type { Project, Deployment } from '@/types';
import { ServiceCard } from './service-card';
import { ServicesSkeleton } from './services-skeleton';
import { isInFlight, extractRepoKey, type ServiceGroup } from './services-utils';

interface ServicesBodyProps {
  project: Project;
  deployments: Deployment[];
  loading: boolean;
  error: string | null;
  githubStatus: { connected: boolean } | null;
  connecting: boolean;
  expandedServices: Set<string>;
  onConnectGithub: () => void;
  onAction: (id: string, action: string) => void;
  onToggleService: (name: string) => void;
}

export function ServicesBody({
  project, deployments, loading, error, githubStatus, connecting,
  expandedServices, onConnectGithub, onAction, onToggleService,
}: ServicesBodyProps) {
  const services: ServiceGroup[] = (() => {
    const map = new Map<string, Deployment[]>();
    for (const d of deployments) {
      const key = (d as any).serviceName || extractRepoKey(d.sourceUrl) || 'default';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return Array.from(map.entries()).map(([name, depls]) => ({
      name,
      deployments: depls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }));
  })();

  const router = useRouter();
  const healthyCount = services.filter(s => s.deployments[0]?.status === 'SUCCESS').length;
  const activeCount = services.filter(s => isInFlight(s.deployments[0]?.status)).length;

  if (loading) return <ServicesSkeleton />;

  return (
    <>
      {error && <Card className="border border-[var(--danger)]/30 py-3 px-4 bg-[var(--danger)]/5"><p className="text-sm text-[var(--danger)]">{error}</p></Card>}

      {services.length === 0 && (
        <EmptyState
          icon={<div className="w-16 h-16 rounded-2xl bg-[var(--rail)] border border-[var(--rail-light)] flex items-center justify-center"><HugeiconsIcon icon={Rocket01Icon} size={32} className="text-[var(--text-muted)]" /></div>}
          title="Deploy your first service"
          description="Connect a Git provider or upload an archive to deploy your first service."
          action={
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
              <Button variant="primary" size="sm" onClick={() => router.push(`/projects/${project.id}/services/new`)} className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Rocket01Icon} size={13} /> Create service
              </Button>
              {!githubStatus?.connected && (
                <Button variant="ghost" size="sm" onClick={onConnectGithub} disabled={connecting} className="flex items-center gap-1.5 text-[var(--text-muted)]">
                  {connecting ? <Spinner size="sm" /> : <HugeiconsIcon icon={GithubIcon} size={13} />}
                  Connect GitHub
                </Button>
              )}
            </div>
          }
        />
      )}

      {services.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map(svc => (
            <ServiceCard key={svc.name} service={svc} projectId={project.id}
              onAction={onAction} isExpanded={expandedServices.has(svc.name)} onToggle={() => onToggleService(svc.name)} />
          ))}
        </div>
      )}

      {services.length > 0 && !activeCount && (
        <div className="flex items-center justify-center gap-2 py-3 text-xs text-[var(--text-dim)]">
          <HugeiconsIcon icon={Rocket01Icon} size={14} className="text-[var(--success)]" /> All services are healthy
        </div>
      )}
    </>
  );
}
