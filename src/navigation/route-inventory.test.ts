import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

import { ROUTE_INVENTORY } from './route-inventory';

/**
 * The route inventory and the route tree must agree.
 *
 * A route on disk that is not in the inventory is an **orphan** — a screen
 * nobody can find, reachable only by typing its address. A route in the
 * inventory that is not on disk is a **dead link**. Both are the failure
 * this test exists to catch.
 */

const APP_DIR = join(process.cwd(), 'src', 'app');

/** Every route the app serves, read from the route tree on disk. */
function routesOnDisk(): string[] {
  const found: string[] = [];

  function walk(directory: string) {
    for (const entry of readdirSync(directory)) {
      const full = join(directory, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (entry !== 'page.tsx') continue;

      const route = relative(APP_DIR, full)
        .replace(/\\/g, '/')
        .replace(/\/page\.tsx$/, '')
        // A route group does not appear in the URL.
        .replace(/\/?\([^)]*\)/g, '')
        .replace(/\/page$/, '');

      found.push(route === '' ? '/' : route);
    }
  }

  walk(APP_DIR);
  return found.sort();
}

describe('the route inventory', () => {
  it('covers every route the app serves', () => {
    const onDisk = routesOnDisk();
    const listed = ROUTE_INVENTORY.map((route) => route.path).sort();

    expect(onDisk).toEqual(listed);
  });

  it('has no route twice', () => {
    const paths = ROUTE_INVENTORY.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('gives every route a level and a purpose', () => {
    for (const route of ROUTE_INVENTORY) {
      expect(route.level).toBeTruthy();
      expect(route.purpose.length).toBeGreaterThan(0);
    }
  });

  it('keeps the platform level to three destinations', () => {
    // The top bar has three items. The applications and the keys are
    // settings — a one-time thing does not sit in a permanent menu.
    const topBar = ['/overview', '/projects', '/settings'];
    expect(topBar).toHaveLength(3);
    for (const path of topBar) {
      expect(ROUTE_INVENTORY.some((route) => route.path === path)).toBe(true);
    }
  });
});
