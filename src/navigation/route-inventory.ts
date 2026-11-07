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

  // ── Signing in ────────────────────────────────────────────────────────────
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
    path: '/settings/api-keys',
    level: 'platform',
    canonical: true,
    purpose: 'The keys that act as the operator.',
  },
];

/** The routes that belong to the platform level. */
export function platformRoutes(): RouteEntry[] {
  return ROUTE_INVENTORY.filter((route) => route.level === 'platform');
}
