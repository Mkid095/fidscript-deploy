import Link from 'next/link';

import { Card, SectionHeader } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import type { InstantApp, ProjectShape } from '@/lib/api/types';
import type {
  Database,
  Deployment,
  Domain,
  Function,
  ProjectEvent,
} from '@/lib/api/resources';
import { sayEvent, sayWhen } from '@/lib/events';

/**
 * The project overview.
 *
 * It is the screen the project opens on, so it is a **dashboard of the
 * services the project lives on** — what is up, what is not, and where to
 * go from here. Every number is read from the API; a number that cannot
 * be read says so, and nothing here is a zero dressed up as one.
 */
export function ProjectOverview({
  projectSlug,
  shape,
  deploymentOn,
  instant,
  deployments,
  domains,
  databases,
  functions,
  emailDomains,
  buckets,
  memberCount,
  whatsapp,
  events,
}: {
  projectSlug: string;
  shape: ProjectShape;
  deploymentOn: boolean;
  instant: {
    available: boolean;
    dashboardUrl: string | null;
    app: InstantApp | null;
  } | null;
  deployments: Deployment[];
  domains: Domain[];
  databases: Database[];
  functions: Function[];
  emailDomains: number;
  buckets: Array<{ id: string; name: string }>;
  memberCount: number;
  /** The WhatsApp platform is a property of the machine, not the project. */
  whatsapp: boolean;
  events: ProjectEvent[];
}) {
  const base = `/projects/${projectSlug}`;
  const hasBackend = shape === 'BACKEND' || shape === 'BOTH';

  const running = deployments.filter(
    (deployment) => deployment.status.toUpperCase() === 'SUCCESS',
  );
  const failed = deployments.filter(
    (deployment) => deployment.status.toUpperCase() === 'FAILED',
  );
  const live = running[0];
  const activeDomains = domains.filter(
    (domain) => (domain.dnsStatus ?? '').toUpperCase() === 'ACTIVE',
  );
  const readyDatabases = databases.filter(
    (database) => database.status === 'ready',
  );
  const brokenDatabases = databases.filter(
    (database) => database.status === 'unhealthy',
  );

  const next = nextStep({
    hasBackend,
    hasApp: Boolean(instant?.app),
    deploymentOn,
    deploymentCount: deployments.length,
    memberCount,
    domainCount: domains.length,
    href: base,
  });

  const services: Array<{
    name: string;
    detail: string;
    state: 'live' | 'idle' | 'off' | 'broken';
    href: string;
  }> = [
    {
      name: 'App',
      detail: live
        ? live.deploymentUrl ?? 'deployed'
        : failed.length > 0
          ? `${failed.length} failed build(s)`
          : 'Not deployed yet',
      state: live ? 'live' : failed.length > 0 ? 'broken' : 'off',
      href: `${base}/deployments`,
    },
    {
      name: 'Domains',
      detail:
        domains.length === 0
          ? 'Nothing points here yet'
          : `${activeDomains.length} live of ${domains.length}`,
      state: activeDomains.length > 0 ? 'live' : domains.length > 0 ? 'idle' : 'off',
      href: `${base}/domains`,
    },
    {
      name: 'Databases',
      detail:
        databases.length === 0
          ? 'Not created yet'
          : brokenDatabases.length > 0
            ? `${brokenDatabases.length} unhealthy`
            : `${readyDatabases.length} ready of ${databases.length}`,
      state:
        readyDatabases.length > 0
          ? 'live'
          : brokenDatabases.length > 0
            ? 'broken'
            : databases.length > 0
              ? 'idle'
              : 'off',
      href: `${base}/databases`,
    },
    {
      name: 'Functions',
      detail:
        functions.length === 0 ? 'None yet' : `${functions.length} deployed`,
      state: functions.length > 0 ? 'live' : 'off',
      href: `${base}/functions`,
    },
    {
      name: 'Mail',
      detail:
        emailDomains === 0
          ? 'No mail domain yet'
          : `${emailDomains} mail domain(s)`,
      state: emailDomains > 0 ? 'live' : 'off',
      href: `${base}/email`,
    },
    {
      name: 'Storage',
      detail:
        buckets.length === 0 ? 'No bucket yet' : `${buckets.length} bucket(s)`,
      state: buckets.length > 0 ? 'live' : 'off',
      href: `${base}/databases`,
    },
    {
      name: 'Packages',
      detail: 'Shared libraries this project can use',
      state: 'idle',
      href: `${base}/packages`,
    },
    {
      name: 'WhatsApp',
      detail: whatsapp
        ? 'Available on this machine'
        : 'Not available on this machine',
      state: whatsapp ? 'live' : 'off',
      href: `${base}/whatsapp`,
    },
  ];

  return (
    <>
      {deploymentOn ? (
        <section>
          <SectionHeader
            title="Your app"
            description="The latest thing that is up, and how to reach it."
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
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                {live?.deploymentUrl ? (
                  <>
                    <a
                      href={live.deploymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-sm font-medium text-accent hover:underline"
                    >
                      {live.deploymentUrl}
                    </a>
                    <p className="mt-0.5 text-xs text-text-dim">
                      {live.release?.version ?? 'the running deployment'}
                      {live.release?.branch ? ` · ${live.release.branch}` : ''}
                      {live.completedAt ? ` · up since ${sayWhen(live.completedAt)}` : ''}
                    </p>
                  </>
                ) : failed.length > 0 ? (
                  <p className="text-sm text-danger">
                    The last build failed — the previous build may still be up.
                  </p>
                ) : (
                  <p className="text-sm text-text-muted">Nothing is up yet.</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {live?.deploymentUrl ? (
                  <a href={live.deploymentUrl} target="_blank" rel="noreferrer">
                    <Button variant="secondary" size="sm">
                      Open the app
                    </Button>
                  </a>
                ) : (
                  <Link href={`${base}/deployments/new`}>
                    <Button variant="primary" size="sm">
                      Deploy your application
                    </Button>
                  </Link>
                )}
                <Link href={`${base}/logs`} className="text-xs text-text-muted hover:text-text">
                  Logs
                </Link>
                <Link href={`${base}/monitoring`} className="text-xs text-text-muted hover:text-text">
                  Monitoring
                </Link>
              </div>
            </div>

            {deployments.slice(0, 3).map((deployment) => (
              <div
                key={deployment.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
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
                    deployment.status.toUpperCase() === 'SUCCESS'
                      ? 'success'
                      : deployment.status.toUpperCase() === 'FAILED'
                        ? 'danger'
                        : 'neutral'
                  }
                >
                  {deployment.status.toLowerCase()}
                </Badge>
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      <section>
        <SectionHeader
          title="Services"
          description="What this project lives on, and whether each of it is up."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => (
            <Link
              key={service.name}
              href={service.href}
              className="group rounded-lg border border-rail bg-surface p-4 transition-colors hover:border-rail-light"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text">{service.name}</span>
                <Badge tone={serviceTone(service.state)}>{stateLabel(service.state)}</Badge>
              </div>
              <p className="mt-1.5 truncate text-xs text-text-dim">{service.detail}</p>
              <p className="mt-2 text-xs text-accent opacity-0 transition-opacity group-hover:opacity-100">
                Open
              </p>
            </Link>
          ))}
        </div>
      </section>

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
                      href={`${instant.dashboardUrl.replace(/\/+$/, '')}/dash?app=${instant.app.appId}`}
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

      <section>
        <SectionHeader
          title="Recent activity"
          description="The last things that happened in this project."
          actions={
            <Link
              href={`${base}/activity`}
              className="text-xs text-text-muted transition-colors hover:text-text"
            >
              Everything
            </Link>
          }
        />
        <Card>
          {events.length === 0 ? (
            <EmptyState
              title="Nothing has happened yet"
              body="Every change in this project will show up here."
            />
          ) : (
            <ul className="divide-y divide-rail">
              {events.slice(0, 5).map((event) => (
                <li key={event.id} className="px-4 py-3">
                  <p className="text-sm text-text">{sayEvent(event.type)}</p>
                  <p className="mt-0.5 text-xs text-text-dim">
                    {sayWhen(event.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
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

/** The one word a service state becomes on a tile. */
function stateLabel(state: 'live' | 'idle' | 'off' | 'broken'): string {
  if (state === 'live') return 'live';
  if (state === 'broken') return 'needs attention';
  if (state === 'idle') return 'open';
  return 'not yet';
}

function serviceTone(
  state: 'live' | 'idle' | 'off' | 'broken',
): 'success' | 'neutral' | 'warning' | 'danger' {
  if (state === 'live') return 'success';
  if (state === 'broken') return 'danger';
  if (state === 'idle') return 'warning';
  return 'neutral';
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
  domainCount?: number;
  memberCount: number;
  href: string;
}): { label: string; href: string } | null {
  const {
    hasBackend,
    hasApp,
    deploymentOn,
    deploymentCount,
    domainCount = 0,
    memberCount,
    href,
  } = input;

  if (hasBackend && !hasApp) {
    return {
      label: 'Create the application backend',
      href: `${href}/settings`,
    };
  }
  if (deploymentOn && deploymentCount === 0) {
    return {
      label: 'Deploy your application',
      href: `${href}/deployments/new`,
    };
  }
  if (deploymentOn && deploymentCount > 0 && domainCount === 0) {
    return { label: 'Connect a domain', href: `${href}/domains` };
  }
  if (memberCount <= 1) {
    return { label: 'Invite a teammate', href: `${href}/members` };
  }
  return null;
}
