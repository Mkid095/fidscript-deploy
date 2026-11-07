import { describe, it, expect } from 'vitest';

import { getFilteredNavGroups, getProjectRole, isCreating } from './sidebar-hooks';
import { getMobilePriorityIds, getNavGroups } from '@/app/(app)/projects/[projectId]/nav-groups';

/**
 * The project's navigation, and what a role may see in it.
 *
 * The role is the member's own role — the API enforces it, and the
 * navigation must not offer a viewer the settings that the API would
 * refuse.
 */

const project = (role?: string) => ({ id: 'p1', name: 'P', slug: 'p', role } as any);

describe("a project's role", () => {
  it('is the member\'s own role', () => {
    expect(getProjectRole(project('admin'))).toBe('admin');
    expect(getProjectRole(project('ADMIN'))).toBe('admin');
  });

  it('is a viewer when there is none', () => {
    expect(getProjectRole(project())).toBe('viewer');
  });
});

describe('the navigation and the role', () => {
  it('hides the settings from a viewer', () => {
    const ids = getFilteredNavGroups('deploy', 'viewer').flatMap((g) => g.items.map((i) => i.id));
    expect(ids).not.toContain('settings');
  });

  it('hides the settings from a developer', () => {
    const ids = getFilteredNavGroups('deploy', 'developer').flatMap((g) => g.items.map((i) => i.id));
    expect(ids).not.toContain('settings');
  });

  it('shows the settings to an admin and to an owner', () => {
    for (const role of ['admin', 'owner']) {
      const ids = getFilteredNavGroups('deploy', role).flatMap((g) => g.items.map((i) => i.id));
      expect(ids).toContain('settings');
    }
  });

  it('shows a viewer the project\'s own sections', () => {
    const ids = getFilteredNavGroups('deploy', 'viewer').flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('overview');
    expect(ids).toContain('members');
    expect(ids).toContain('activity');
    expect(ids).toContain('deployments');
  });
});

describe('the navigation', () => {
  it('has the same groups in both modes, with the mode\'s own resources', () => {
    const deploy = getNavGroups('deploy').flatMap((g) => g.items.map((i) => i.id));
    const baas = getNavGroups('baas').flatMap((g) => g.items.map((i) => i.id));

    expect(deploy).toContain('services');
    expect(baas).toContain('queues');
    expect(baas).not.toContain('services');
    // The project's own sections are in both.
    for (const id of ['overview', 'members', 'activity', 'settings']) {
      expect(deploy).toContain(id);
      expect(baas).toContain(id);
    }
  });

  it('has no group with the same name twice', () => {
    for (const mode of ['deploy', 'baas'] as const) {
      const labels = getNavGroups(mode).map((g) => g.label);
      expect(new Set(labels).size).toBe(labels.length);
    }
  });
});

describe('the mobile navigation', () => {
  it('shows a few items and the rest behind "More"', () => {
    const priority = getMobilePriorityIds('deploy');
    expect(priority.length).toBeLessThanOrEqual(5);
    const all = getNavGroups('deploy').flatMap((g) => g.items.map((i) => i.id));
    expect(priority.every((id) => all.includes(id))).toBe(true);
  });

  it('shows the same items in both modes', () => {
    expect(getMobilePriorityIds('deploy').length).toBe(getMobilePriorityIds('baas').length);
  });
});

describe('the project\'s state', () => {
  it('knows when a project is still being created', () => {
    expect(isCreating('CREATING')).toBe(true);
    expect(isCreating('ACTIVE')).toBe(false);
    expect(isCreating(undefined)).toBe(false);
  });
});
