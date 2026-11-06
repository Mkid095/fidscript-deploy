/**
 * The dashboard's route inventory.
 *
 * Every route the dashboard serves, who owns it, and where it sits in the
 * navigation. It is the **source of truth**: a test reads the route tree on
 * disk and fails when a route is here but not there — or there but not
 * here. That is what keeps an orphaned screen from quietly becoming a second
 * way of doing the same thing.
 */

/** Who owns a route. */
export type RouteOwner =
  /** The platform: the operator's own work and the platform itself. */
  | 'platform'
  /** A project: one of its resources. */
  | 'project'
  /** The platform's own surfaces — the mail console, the integrations. */
  | 'platform-surface'
  /** The front door and the pages around it. */
  | 'public'
  /** Signing in, signing up, and the pages around them. */
  | 'auth';

/** One route: its path, its owner, where it is linked from, and whether it is the canonical address. */
export type RouteEntry = [path: string, owner: RouteOwner, nav: string | null, canonical: boolean];

/**
 * The routes.
 *
 * `nav` says where the route is reachable from:
 *  - `platform` — the platform's navigation;
 *  - `project:<id>` — the project's sidebar, under that item;
 *  - `email` — the email console's own links;
 *  - `null` — reachable by its address only.
 *
 * `canonical` is false for a route that **sends the caller somewhere else**:
 * the old flat paths that now belong to the project console.
 */
export const ROUTE_INVENTORY: RouteEntry[] = [
  // ── The front door ────────────────────────────────────────────────────────
  ['/', 'public', null, true],
  ['/home', 'public', null, true],
  ['/docs', 'public', 'landing', true],
  ['/docs/[slug]', 'public', 'landing', true],

  // ── Signing in ────────────────────────────────────────────────────────────
  ['/login', 'auth', 'landing', true],
  ['/register', 'auth', 'landing', true],
  ['/forgot-password', 'auth', null, true],
  ['/invitations/accept', 'auth', null, true],
  ['/setup', 'auth', null, true],
  ['/onboarding', 'auth', null, true],
  ['/force-change-password', 'auth', null, true],

  // ── The platform ──────────────────────────────────────────────────────────
  ['/overview', 'platform', 'platform', true],
  ['/projects', 'platform', 'platform', true],
  ['/applications', 'platform', 'platform', true],
  ['/applications/email', 'platform', 'platform', true],
  ['/applications/package-manager', 'platform', 'platform', true],
  ['/settings', 'platform', 'platform', true],
  ['/mcp', 'platform', 'platform', true],
  ['/deployments/new', 'platform', 'platform', true],

  // ── The platform's own surfaces ───────────────────────────────────────────
  ['/platform/email', 'platform-surface', 'settings', true],
  ['/platform/email/settings', 'platform-surface', 'settings', true],
  ['/platform/integrations/settings', 'platform-surface', 'settings', true],

  // ── The project console ───────────────────────────────────────────────────
  ['/projects/[projectId]', 'project', null, true],
  ['/projects/[projectId]/overview', 'project', 'project:overview', true],
  ['/projects/[projectId]/services', 'project', 'project:services', true],
  ['/projects/[projectId]/services/new', 'project', null, true],
  ['/projects/[projectId]/functions', 'project', 'project:functions', true],
  ['/projects/[projectId]/functions/[id]', 'project', null, true],
  ['/projects/[projectId]/deployments', 'project', 'project:deployments', true],
  ['/projects/[projectId]/deployments/[deploymentId]', 'project', null, true],
  ['/projects/[projectId]/deployments/build-config', 'project', null, true],
  ['/projects/[projectId]/databases', 'project', 'project:databases', true],
  ['/projects/[projectId]/databases/[databaseId]', 'project', null, true],
  ['/projects/[projectId]/databases/[databaseId]/backups', 'project', null, true],
  ['/projects/[projectId]/databases/[databaseId]/explorer', 'project', null, true],
  ['/projects/[projectId]/databases/[databaseId]/realtime', 'project', null, true],
  ['/projects/[projectId]/databases/[databaseId]/settings', 'project', null, true],
  ['/projects/[projectId]/databases/[databaseId]/sql', 'project', null, true],
  ['/projects/[projectId]/storage', 'project', 'project:storage', true],
  ['/projects/[projectId]/storage/[bucket]', 'project', null, true],
  ['/projects/[projectId]/storage/settings', 'project', null, true],
  ['/projects/[projectId]/instant', 'project', 'project:instant', true],
  ['/projects/[projectId]/domains', 'project', 'project:domains', true],
  ['/projects/[projectId]/domains/[domainId]', 'project', null, true],
  ['/projects/[projectId]/email', 'project', 'project:email', true],
  ['/projects/[projectId]/email/analytics', 'project', 'email', true],
  ['/projects/[projectId]/email/templates', 'project', 'email', true],
  ['/projects/[projectId]/email/webhooks', 'project', 'email', true],
  ['/projects/[projectId]/email/suppressions', 'project', 'email', true],
  ['/projects/[projectId]/email/domains/[domainId]', 'project', 'email', true],
  ['/projects/[projectId]/email/domains/[domainId]/mailboxes/[mailboxId]', 'project', 'email', true],
  ['/projects/[projectId]/scheduler', 'project', 'project:scheduler', true],
  ['/projects/[projectId]/scheduler/[jobId]', 'project', null, true],
  ['/projects/[projectId]/monitoring', 'project', 'project:monitoring', true],
  ['/projects/[projectId]/monitoring/[id]', 'project', null, true],
  ['/projects/[projectId]/logs', 'project', 'project:logs', true],
  ['/projects/[projectId]/mcp', 'project', 'project:mcp', true],
  ['/projects/[projectId]/queues', 'project', 'project:queues', true],
  ['/projects/[projectId]/queues/[queueId]', 'project', null, true],
  ['/projects/[projectId]/realtime', 'project', 'project:realtime', true],
  ['/projects/[projectId]/members', 'project', 'project:members', true],
  ['/projects/[projectId]/activity', 'project', 'project:activity', true],
  ['/projects/[projectId]/settings', 'project', 'project:settings', true],

  // ── The old flat paths — they send the caller to the project console ──────
  ['/functions', 'project', null, false],
  ['/functions/[id]', 'project', null, false],
  ['/databases', 'project', null, false],
  ['/databases/[id]', 'project', null, false],
  ['/logs', 'project', null, false],
  ['/monitoring', 'project', null, false],
  ['/monitoring/[id]', 'project', null, false],
  ['/scheduler', 'project', null, false],
  ['/scheduler/[id]', 'project', null, false],
  ['/email', 'project', null, false],
  ['/email/[domain]', 'project', null, false],
  ['/email/[domain]/mailboxes/[mailbox]', 'project', null, false],
  ['/email/analytics', 'project', null, false],
  ['/email/templates', 'project', null, false],
  ['/email/webhooks', 'project', null, false],
  ['/email/suppressions', 'project', null, false],
];

/** The routes the platform's own navigation carries. */
export function platformRoutes(): string[] {
  return ROUTE_INVENTORY.filter(([, owner, nav]) => owner === 'platform' && nav === 'platform').map(
    ([path]) => path,
  );
}
