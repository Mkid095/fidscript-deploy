import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import { ROUTE_INVENTORY } from './route-inventory';
import { PLATFORM_NAV, isPlatformNavActive } from './platform-nav';
import { getNavGroups } from '@/app/(app)/projects/[projectId]/nav-groups';

/**
 * The route inventory, and the navigation that points at it.
 *
 * The inventory is the dashboard's map of itself: every route, who owns it
 * and where it is linked from. A route that is on disk but not in the
 * inventory is an **orphan** — a screen nobody can reach and nobody
 * remembers. A route in the inventory that is not on disk is a **dead link**
 * in the navigation.
 *
 * The audit found twenty-two orphans. This test is what stops the next
 * twenty-two from appearing.
 */

const APP_DIR = path.resolve(__dirname, '../app');

/** Every route the dashboard serves, read from the route tree on disk. */
function routesOnDisk(): string[] {
  const routes: string[] = [];

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'api') continue;
        walk(full);
        continue;
      }
      if (entry.name !== 'page.tsx') continue;
      const rel = path.relative(APP_DIR, path.dirname(full));
      const segments = rel
        .split(path.sep)
        .filter((s) => s && !(s.startsWith('(') && s.endsWith(')')));
      routes.push('/' + segments.join('/'));
    }
  };

  walk(APP_DIR);
  return routes.map((r) => r.replace(/\/$/, '') || '/').sort();
}

const onDisk = routesOnDisk();
const inventory = ROUTE_INVENTORY.map(([route]) => route);

describe('the route inventory', () => {
  it('covers every route the dashboard serves', () => {
    const missing = onDisk.filter((route) => !inventory.includes(route));
    expect(missing).toEqual([]);
  });

  it('names no route the dashboard does not serve', () => {
    const missing = inventory.filter((route) => !onDisk.includes(route));
    expect(missing).toEqual([]);
  });

  it('has no route twice', () => {
    const seen = new Set<string>();
    const twice = inventory.filter((route) => (seen.has(route) ? true : (seen.add(route), false)));
    expect(twice).toEqual([]);
  });
});

describe('the platform navigation', () => {
  it('points only at routes that exist', () => {
    const dead = PLATFORM_NAV.filter((item) => !inventory.includes(item.href));
    expect(dead).toEqual([]);
  });

  it('is in step with the inventory', () => {
    const inNav = inventory.filter(([, owner, nav]) => owner === 'platform' && nav === 'platform');
    const missing = inNav.filter(([route]) => !PLATFORM_NAV.some((item) => item.href === route));
    expect(missing).toEqual([]);
  });

  it('marks the page the operator is on', () => {
    expect(isPlatformNavActive('/projects', '/projects')).toBe(true);
    expect(isPlatformNavActive('/projects', '/projects/abc/services')).toBe(true);
    expect(isPlatformNavActive('/projects', '/overview')).toBe(false);
    expect(isPlatformNavActive('/overview', '/overview')).toBe(true);
  });
});

describe('the project navigation', () => {
  const groups = getNavGroups('deploy');

  it('points only at project routes that exist', () => {
    const dead = groups
      .flatMap((group) => group.items)
      .filter((item) => !inventory.includes(`/projects/[projectId]${item.href}`));
    expect(dead).toEqual([]);
  });

  it('reaches the project\'s own sections', () => {
    const ids = groups.flatMap((group) => group.items.map((item) => item.id));
    expect(ids).toContain('overview');
    expect(ids).toContain('members');
    expect(ids).toContain('activity');
  });
});
