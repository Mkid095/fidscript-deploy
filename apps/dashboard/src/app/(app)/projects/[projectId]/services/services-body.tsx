// Services page body — accepts pre-computed ServiceGroup[] from registry

import { useRouter } from 'next/navigation';
import { Card, Button, EmptyState, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Rocket01Icon, GithubIcon } from '@hugeicons/core-free-icons';

import type { ServiceGroup } from './services-utils';
import { ServiceCard } from './service-card';
import { ServicesSkeleton } from './services-skeleton';
import { isInFlight } from './services-utils';

interface ServicesBodyProps {
  projectId: string;
  services: ServiceGroup[];
  error: string | null;
  githubConnected: boolean;
  connecting: boolean;
  expanded: Set<string>;
  onConnectGithub: () => void;
  onAction: (id: string, action: string) => void;
  onToggleService: (name: string) => void;
}

export function ServicesBody({
  projectId,
  services,
  error,
  githubConnected,
  connecting,
  expanded,
  onConnectGithub,
  onAction,
  onToggleService,
}: ServicesBodyProps) {
  const router = useRouter();
  const healthyCount = services.filter(s => s.deployments[0]?.status === 'SUCCESS').length;
  const activeCount = services.filter(s => isInFlight(s.deployments[0]?.status)).length;

  return (
    <>
      {error && (
        <Card className="border border-[var(--danger)]/30 py-3 px-4 bg-[var(--danger)]/5">
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </Card>
      )}

      {services.length === 0 && (
        <EmptyState
          icon={
            <div className="w-16 h-16 rounded-2xl bg-[var(--rail)] border border-[var(--rail-light)] flex items-center justify-center">
              <HugeiconsIcon icon={Rocket01Icon} size={32} className="text-[var(--text-muted)]" />
            </div>
          }
          title="Deploy your first service"
          description="Connect a Git provider or upload an archive to deploy your first service."
          action={
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push(`/projects/${projectId}/services/new`)}
                className="flex items-center gap-1.5"
              >
                <HugeiconsIcon icon={Rocket01Icon} size={13} /> Create service
              </Button>
              {!githubConnected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onConnectGithub}
                  disabled={connecting}
                  className="flex items-center gap-1.5 text-[var(--text-muted)]"
                >
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
            <ServiceCard
              key={svc.name}
              service={svc}
              projectId={projectId}
              onAction={onAction}
              isExpanded={expanded.has(svc.name)}
              onToggle={() => onToggleService(svc.name)}
            />
          ))}
        </div>
      )}

      {services.length > 0 && !activeCount && (
        <div className="flex items-center justify-center gap-2 py-3 text-xs text-[var(--text-dim)]">
          <HugeiconsIcon icon={Rocket01Icon} size={14} className="text-[var(--success)]" />
          All services are healthy
        </div>
      )}
    </>
  );
}
