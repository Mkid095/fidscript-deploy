import Link from 'next/link';

import { Card, SectionHeader } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import type { InstantApp, ProjectShape } from '@/lib/api/types';
import type { Deployment } from '@/lib/api/resources';

/**
 * The project overview.
 *
 * It answers **what is this, what does it have, what do I do next** — and
 * every number in it is read from the API. A number that cannot be known
 * says "Not available"; it never shows a zero it did not read.
 */
export function ProjectOverview({
  projectSlug,
  name,
  shape,
  status,
  deploymentOn,
  instant,
  deployments,
  memberCount,
  emailOn,
}: {
  projectSlug: string;
  name: string;
  shape: ProjectShape;
  status: string;
  deploymentOn: boolean;
  instant: { available: boolean; dashboardUrl: string | null; app: InstantApp | null } | null;
  deployments: Deployment[];
  memberCount: number;
  emailOn: boolean;
}) {
  const base = `/projects/${projectSlug}`;
  const hasBackend = shape === 'BACKEND' || shape === 'BOTH';

  const running = deployments.filter((deployment) => deployment.status === 'SUCCESS');
  const failed = deployments.filter((deployment) => deployment.status === 'FAILED');
  const lastDeployment = deployments[0];

  const next = nextStep({
    hasBackend,
    hasApp: Boolean(instant?.app),
    deploymentOn,
    deploymentCount: deployments.length,
    memberCount,
    href: base,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-text">{name}</h1>
        <p className="mt-1 text-sm text-text-muted">
          {shapeLabel(shape)} · {status.toLowerCase()}
        </p>
      </header>

      {hasBackend ? (
        <section>
          <SectionHeader title="The backend" />
          <Card className="p-4">
            {instant?.app ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-text">
                  <span className="font-medium">{instant.app.title}</span>{' '}
                  <span className="text-text-dim">{instant.app.appId}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Badge tone="success">{instant.app.status}</Badge>
                  {instant.dashboardUrl ? (
                    <a
                      href={instant.dashboardUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-accent hover:underline"
                    >
                      Open the console
                    </a>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                {instant?.available
                  ? 'No application backend yet.'
                  : 'The platform holds no Instant credential, so no backend can be created yet.'}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`${base}/connect`}>
                <Button variant="secondary" size="sm">
                  Connect an app
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      ) : null}

      {deploymentOn ? (
        <section>
          <SectionHeader title="Deployments" />
          <Card className="p-4">
            <p className="text-sm text-text">
              <span className="font-medium">{running.length}</span> running
              {failed.length > 0 ? (
                <>
                  {' · '}
                  <span className="font-medium">{failed.length}</span> failed
                </>
              ) : null}
              {lastDeployment ? (
                <span className="text-text-dim"> · last {relativeTime(lastDeployment.createdAt)}</span>
              ) : null}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`${base}/deployments`}>
                <Button variant="secondary" size="sm">
                  View deployments
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      ) : null}

      <section>
        <SectionHeader title="Capabilities" />
        <Card className="divide-y divide-rail">
          <Capability name="Email" on={emailOn} />
          <Capability name="WhatsApp" on={false} />
          <Capability name="Packages" on={false} />
        </Card>
      </section>

      <section>
        <SectionHeader title="Next" />
        <Card className="p-4">
          {next ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-text">{next.label}</p>
              <Link href={next.href}>
                <Button variant="primary" size="sm">
                  Go there
                </Button>
              </Link>
            </div>
          ) : (
            <EmptyState
              title="Nothing is waiting"
              body="This project is set up. Deploy something, or connect a domain, when you are ready."
            />
          )}
        </Card>
      </section>
    </div>
  );
}

/**
 * The next step — the first that applies.
 *
 * The order is the guide's: the backend, then a deployment, then a domain,
 * then a teammate. After that, nothing is urgent.
 */
export function nextStep(input: {
  hasBackend: boolean;
  hasApp: boolean;
  deploymentOn: boolean;
  deploymentCount: number;
  memberCount: number;
  href: string;
}): { label: string; href: string } | null {
  const { hasBackend, hasApp, deploymentOn, deploymentCount, memberCount, href } = input;

  if (hasBackend && !hasApp) {
    return { label: 'Create the application backend', href: `${href}/settings` };
  }
  if (deploymentOn && deploymentCount === 0) {
    return { label: 'Deploy your application', href: `${href}/deployments` };
  }
  if (deploymentOn && deploymentCount > 0) {
    return { label: 'Connect a domain', href: `${href}/domains` };
  }
  if (memberCount <= 1) {
    return { label: 'Invite a teammate', href: `${href}/members` };
  }
  return null;
}

function Capability({ name, on }: { name: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-sm text-text">{name}</span>
      <Badge tone={on ? 'success' : 'neutral'}>{on ? 'On' : 'Off'}</Badge>
    </div>
  );
}

function shapeLabel(shape: ProjectShape): string {
  if (shape === 'BACKEND') return 'Backend as a service';
  if (shape === 'BOTH') return 'Backend and deployments';
  return 'Deployments';
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'recently';
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
