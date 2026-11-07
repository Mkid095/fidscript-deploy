/**
 * The route inventory.
 *
 * Every route the console serves, the **level** it belongs to, and whether
 * it is the canonical way to reach it.
 *
 * A test walks the route tree on disk and fails when the two disagree: a
 * route on disk that is not here, and a route here that is not on disk.
 * That is what stops the next twenty-two orphans.
 */
export type RouteLevel = 'public' | 'auth' | 'platform' | 'project';

export interface RouteEntry {
  /** The URL. */
  path: string;
  /** The level it belongs to. A screen belongs to exactly one. */
  level: RouteLevel;
  /** Whether this is the one way to reach the screen. */
  canonical: boolean;
  /** What it is for. */
  purpose: string;
}

export const ROUTE_INVENTORY: RouteEntry[] = [
  // ── The front door ───────────────────────────────────────────────────────
  {
    path: '/',
    level: 'public',
    canonical: true,
    purpose: 'What the platform is, and the way in.',
  },

  {
    path: '/setup',
    level: 'public',
    canonical: true,
    purpose: 'The one setup wizard — from an empty machine to a platform that serves.',
  },

  {
    path: '/docs',
    level: 'public',
    canonical: true,
    purpose: 'The documentation — the applications, the CLI, the API, the SDK, the MCP.',
  },

  // ── Signing in ────────────────────────────────────────────────────────────
  {
    path: '/docs/[slug]',
    level: 'public',
    canonical: true,
    purpose: 'A page of the guide.',
  },
  {
    path: '/login',
    level: 'auth',
    canonical: true,
    purpose: 'Sign in with a password.',
  },
  {
    path: '/login/mfa',
    level: 'auth',
    canonical: true,
    purpose: 'The second factor — the code, or a recovery code.',
  },
  {
    path: '/forgot-password',
    level: 'auth',
    canonical: true,
    purpose: 'Ask for a password reset link.',
  },
  {
    path: '/reset-password',
    level: 'auth',
    canonical: true,
    purpose: 'Choose a new password from the reset link.',
  },
  {
    path: '/verify-email',
    level: 'auth',
    canonical: true,
    purpose: 'Confirm an email address from the link.',
  },
  {
    path: '/magic-link',
    level: 'auth',
    canonical: true,
    purpose: 'Sign in from a magic link.',
  },
  {
    path: '/register',
    level: 'auth',
    canonical: true,
    purpose: 'Create an account.',
  },
  {
    path: '/force-change-password',
    level: 'auth',
    canonical: true,
    purpose: 'The installer password has to be changed.',
  },
  {
    path: '/welcome',
    level: 'auth',
    canonical: true,
    purpose: 'The first-time journey — once per person, and never forced.',
  },
  {
    path: '/invitations/accept',
    level: 'auth',
    canonical: true,
    purpose: 'Accept an invitation into a project.',
  },

  // ── The platform ──────────────────────────────────────────────────────────
  {
    path: '/overview',
    level: 'platform',
    canonical: true,
    purpose: 'The operator’s landing page.',
  },
  {
    path: '/projects',
    level: 'platform',
    canonical: true,
    purpose: 'The projects they can reach, and the new-project form.',
  },
  {
    path: '/settings',
    level: 'platform',
    canonical: true,
    purpose: 'The account, and the hub for the settings.',
  },
  {
    path: '/settings/applications',
    level: 'platform',
    canonical: true,
    purpose: 'The applications the platform has.',
  },
  {
    path: '/system',
    level: 'platform',
    canonical: true,
    purpose: 'What the machine is doing, and what is using it.',
  },
  {
    path: '/settings/api-keys',
    level: 'platform',
    canonical: true,
    purpose: 'The keys that act as the operator.',
  },

  // ── The project ───────────────────────────────────────────────────────────
  {
    path: '/projects/[projectId]',
    level: 'project',
    canonical: true,
    purpose: "The project's front door — it always opens on the overview.",
  },
  {
    path: '/projects/[projectId]/overview',
    level: 'project',
    canonical: true,
    purpose: 'What this project is, what it has, and what to do next.',
  },
  {
    path: '/projects/[projectId]/members',
    level: 'project',
    canonical: true,
    purpose: 'Who is in the project, and the way to bring somebody in.',
  },
  {
    path: '/projects/[projectId]/activity',
    level: 'project',
    canonical: true,
    purpose: 'Everything that has happened in the project.',
  },
  {
    path: '/projects/[projectId]/backend',
    level: 'project',
    canonical: true,
    purpose: "The project's backend, and where its console is.",
  },
  {
    path: '/projects/[projectId]/connect',
    level: 'project',
    canonical: true,
    purpose: 'What an application needs to talk to this project.',
  },
  {
    path: '/projects/[projectId]/deployments',
    level: 'project',
    canonical: true,
    purpose: 'The deployments of the project.',
  },
  {
    path: '/projects/[projectId]/deployments/[deploymentId]',
    level: 'project',
    canonical: true,
    purpose: 'One deployment — its state, its build log, what can be done to it.',
  },
  {
    path: '/projects/[projectId]/deployments/new',
    level: 'project',
    canonical: true,
    purpose: 'From a repository to a running application.',
  },
  {
    path: '/projects/[projectId]/domains',
    level: 'project',
    canonical: true,
    purpose: 'Where the project answers.',
  },
  {
    path: '/projects/[projectId]/functions',
    level: 'project',
    canonical: true,
    purpose: 'The code the platform runs for the project.',
  },
  {
    path: '/projects/[projectId]/databases',
    level: 'project',
    canonical: true,
    purpose: 'The databases the project has.',
  },
  {
    path: '/projects/[projectId]/email',
    level: 'project',
    canonical: true,
    purpose: 'The mail of this project — domains, mailboxes, sending.',
  },
  {
    path: '/projects/[projectId]/packages',
    level: 'project',
    canonical: true,
    purpose: 'The registry, and how to publish to it.',
  },
  {
    path: '/projects/[projectId]/whatsapp',
    level: 'project',
    canonical: true,
    purpose: 'The messaging side of the project, and the console that has it.',
  },
  {
    path: '/projects/[projectId]/monitoring',
    level: 'project',
    canonical: true,
    purpose: 'What the platform is watching in the project.',
  },
  {
    path: '/projects/[projectId]/logs',
    level: 'project',
    canonical: true,
    purpose: 'What the project has written down.',
  },
  {
    path: '/projects/[projectId]/settings',
    level: 'project',
    canonical: true,
    purpose: 'What this project is, and everything about it.',
  },
];

/** The routes that belong to the platform level. */
export function platformRoutes(): RouteEntry[] {
  return ROUTE_INVENTORY.filter((route) => route.level === 'platform');
}
