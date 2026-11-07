/**
 * The platform's own navigation.
 *
 * These are the destinations that are **not** a project's: the overview of
 * the operator's own work, the projects they can reach, the applications
 * the platform can have, and their own account settings.
 *
 * A project's resources live in the project console, not here — the two
 * levels are different things and mixing them is how an operator ends up
 * looking for a database in the wrong place.
 */
export interface PlatformNavItem {
  /** Where it goes. */
  href: string;
  /** What it is called. */
  label: string;
  /** A word that says what it is for. */
  hint: string;
}

/** The platform's navigation, in order. */
export const PLATFORM_NAV: PlatformNavItem[] = [
  { href: '/overview', label: 'Overview', hint: 'What is happening across your projects' },
  { href: '/projects', label: 'Projects', hint: 'The projects you can reach' },
  { href: '/applications', label: 'Applications', hint: 'What this platform can have' },
  { href: '/mcp', label: 'API & MCP', hint: 'Your keys, the CLI and the agent connections' },
  { href: '/settings', label: 'Settings', hint: 'Your account and its credentials' },
];

/**
 * Whether a navigation item is the current page.
 *
 * The overview is an exact match — `/overview` is one page. The others are
 * prefixes: `/projects/abc/services` is still "Projects", and `/settings`
 * is still "Settings".
 */
export function isPlatformNavActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  return pathname.startsWith(href + '/');
}
