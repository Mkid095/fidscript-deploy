import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ProjectOverview } from './project-overview';
import type { ProjectHealthReport, ServiceHealth } from '@/lib/api/project';

/**
 * The health section on the overview.
 *
 * It must say what the platform says: the right state word, the reason,
 * and a link to the screen that owns the service — and it must not link
 * where a service is not configured, or render at all when there is no
 * report.
 */

function report(services: ServiceHealth[], overall: ProjectHealthReport['overall']): ProjectHealthReport {
  return { projectId: 'p1', checkedAt: '2026-11-26T11:30:00.000Z', overall, services };
}

/** The screen each service links to — the same paths the API reports. */
const LINKS: Record<ServiceHealth['service'], string> = {
  deployment: '/deployments',
  database: '/databases',
  instantdb: '/backend',
  domains: '/domains',
  email: '/email',
  cron: '/monitoring',
  functions: '/functions',
  storage: '/settings',
};

function svc(
  service: ServiceHealth['service'],
  state: ServiceHealth['state'],
  extra: Partial<ServiceHealth> = {},
): ServiceHealth {
  return { service, configured: state !== 'not_configured', state, link: LINKS[service], ...extra };
}

const fiveStates: ProjectHealthReport = report(
  [
    svc('deployment', 'healthy'),
    svc('database', 'unhealthy', { reason: 'The database is not accepting connections.' }),
    svc('instantdb', 'not_configured', { reason: 'The project has no Instant application.' }),
    svc('domains', 'degraded', { reason: 'A domain is passing with checks failing.' }),
    svc('email', 'unknown', { reason: 'The mail service could not be probed.' }),
    svc('cron', 'not_configured'),
    svc('functions', 'healthy'),
    svc('storage', 'healthy'),
  ],
  'unhealthy',
);

function renderOverview(health: ProjectHealthReport | null) {
  return render(
    <ProjectOverview
      projectSlug="demo"
      shape="DEPLOYMENT"
      deploymentOn
      instant={null}
      deployments={[]}
      domains={[]}
      databases={[]}
      functions={[]}
      emailDomains={0}
      buckets={[]}
      memberCount={1}
      whatsapp={false}
      events={[]}
      health={health}
    />,
  );
}

describe('the overview health section', () => {
  it('shows the overall answer and every configured service’s state', () => {
    renderOverview(fiveStates);
    expect(screen.getByText('Health')).toBeTruthy();
    // The overall badge: worst of the configured services.
    expect(screen.getByText('unhealthy')).toBeTruthy();
    // The reason that makes the failure actionable.
    expect(screen.getByText('The database is not accepting connections.')).toBeTruthy();
    // A service the project does not use says so plainly (there are two).
    expect(screen.getAllByText('Not configured')).toHaveLength(2);
  });

  it('links a configured service to the screen that owns it, and links nowhere when not configured', () => {
    const { container } = renderOverview(fiveStates);
    // Database is configured → an "Open" link to its screen.
    expect(container.querySelector('a[href="/projects/demo/databases"]')).toBeTruthy();
    // Deployment, domains are configured → their screens are reachable.
    expect(container.querySelector('a[href="/projects/demo/deployments"]')).toBeTruthy();
    expect(container.querySelector('a[href="/projects/demo/domains"]')).toBeTruthy();
    // Instant is not configured → no link to its screen.
    expect(container.querySelector('a[href="/projects/demo/backend"]')).toBeNull();
  });

  it('shows a not-configured service’s own reason, not a failure one', () => {
    renderOverview(fiveStates);
    expect(screen.getByText('The project has no Instant application.')).toBeTruthy();
  });

  it('omits the section entirely when there is no report', () => {
    renderOverview(null);
    expect(screen.queryByText('Health')).toBeNull();
  });

  it('reads an all-healthy project as healthy, not as a problem', () => {
    const healthy = report(
      [svc('deployment', 'healthy'), svc('database', 'healthy'), svc('storage', 'healthy')],
      'healthy',
    );
    renderOverview(healthy);
    expect(screen.getByText('healthy')).toBeTruthy();
    expect(screen.queryByText('unhealthy')).toBeNull();
  });
});
