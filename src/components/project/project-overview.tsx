import Link from 'next/link';

import { Card, SectionHeader } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import type { InstantApp, ProjectShape } from '@/lib/api/types';
import type { Deployment } from '@/lib/api/resources';
import { sayWhen } from '@/lib/events';

/**
 * The project overview.
 *
 * It answers **what is this, what does it have, what do I do next** — and
 * every number in it is read from the API. A number that cannot be known
 * says "Not available"; it never shows a zero it did not read.
 */
export function ProjectOverview({
  projectSlug,
  shape,
  deploymentOn,
  instant,
  deployments,
  memberCount,
  capabilities,
}: {
  projectSlug: string;
  shape: ProjectShape;
  deploymentOn: boolean;
  instant: { available: boolean; dashboardUrl: string | null; app: InstantApp | null } | null;
  deployments: Deployment[];
  memberCount: number;
  capabilities: { email: boolean; whatsapp: boolean; packages: boolean };
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
    <>
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
          <SectionHeader
            title="Deployments"
            actions={
              <Link
                href={`${base}/deployments`}
                className="text-xs text-text-muted transition-colors hover:text-text"
              >
                All deployments
              </Link>
            }
          />
          <Card className="divide-y divide-rail">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm text-text">
                <span className="font-medium">{running.length}</span> running
              </span>
              {failed.length > 0 ? (
                <Badge tone="danger">{failed.length} failed</Badge>
              ) : lastDeployment ? (
                <span className="text-xs text-text-dim">
                  last {sayWhen(lastDeployment.createdAt)}
                </span>
              ) : (
                <span className="text-xs text-text-dim">nothing deployed yet</span>
              )}
            </div>

            {deployments.slice(0, 3).map((deployment) => (
              <div key={deployment.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <Link
                    href={`${base}/deployments/${deployment.id}`}
                    className="truncate text-sm text-text hover:text-accent"
                  >
                    {deployment.release?.version ?? 'A deployment'}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-text-dim">
                    {deployment.release?.branch ?? 'no branch'}
                    {deployment.release?.commitSha
                      ? ` · ${deployment.release.commitSha.slice(0, 7)}`
                      : ''}
                  </p>
                </div>
                <Badge
                  tone={
                    deployment.status === 'SUCCESS'
                      ? 'success'
                      : deployment.status === 'FAILED'
                        ? 'danger'
                        : 'neutral'
                  }
                >
                  {deployment.status.toLowerCase()}
                </Badge>
              </div>
            ))}

            {deployments.length === 0 ? (
              <div className="px-4 py-3">
                <Link href={`${base}/deployments/new`}>
                  <Button variant="secondary" size="sm">
                    Deploy your application
                  </Button>
                </Link>
              </div>
            ) : null}
          </Card>
        </section>
      ) : null}

      <section>
        <SectionHeader title="Capabilities" />
        <Card className="divide-y divide-rail">
          <Capability
            name="Email"
            on={capabilities.email}
            href={`${base}/email`}
            action={capabilities.email ? 'Open' : 'Turn on'}
          />
          <Capability
            name="WhatsApp"
            on={capabilities.whatsapp}
            href={`${base}/whatsapp`}
            action="Open"
          />
          <Capability
            name="Packages"
            on={capabilities.packages}
            href={`${base}/packages`}
            action="Open"
          />
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
    </>
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
    return { label: 'Deploy your application', href: `${href}/deployments/new` };
  }
  if (deploymentOn && deploymentCount > 0) {
    return { label: 'Connect a domain', href: `${href}/domains` };
  }
  if (memberCount <= 1) {
    return { label: 'Invite a teammate', href: `${href}/members` };
  }
  return null;
}

function Capability({
  name,
  on,
  href,
  action,
}: {
  name: string;
  on: boolean;
  href: string;
  action: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-sm text-text">{name}</span>
      <div className="flex items-center gap-3">
        <Link href={href} className="text-xs text-accent hover:underline">
          {action}
        </Link>
        <Badge tone={on ? 'success' : 'neutral'}>{on ? 'On' : 'Off'}</Badge>
      </div>
    </div>
  );
}

