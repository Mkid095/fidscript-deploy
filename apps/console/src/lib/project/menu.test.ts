import { describe, it, expect } from 'vitest';

import { buildProjectMenu, groupMenuItems, type MenuInput } from './menu';

/**
 * The derived menu.
 *
 * The rule being held: **the menu shows what the project has; the overview
 * shows what it could have.** So an empty project is not given a wall of
 * items it cannot use.
 */
const BASE: MenuInput = {
  projectPath: '/projects/acme',
  shape: 'DEPLOYMENT',
  deploymentOn: true,
  capabilities: { email: false, whatsapp: false, packages: false },
  resources: { functions: 0, databases: 0, deployments: 0, domains: 0 },
  role: 'owner',
};

const ids = (input: Partial<MenuInput>) =>
  buildProjectMenu({ ...BASE, ...input }).map((item) => item.id);

describe('the project menu', () => {
  it('always has the project itself', () => {
    expect(ids({})).toEqual(
      expect.arrayContaining(['overview', 'members', 'activity']),
    );
  });

  it('opens on the overview, not on a section', () => {
    const overview = buildProjectMenu(BASE).find(
      (item) => item.id === 'overview',
    );
    expect(overview?.href).toBe('/projects/acme/overview');
  });

  it('shows the backend for a backend project', () => {
    expect(ids({ shape: 'BACKEND' })).toEqual(
      expect.arrayContaining(['backend', 'connect']),
    );
  });

  it('shows the backend for a project that is both', () => {
    expect(ids({ shape: 'BOTH' })).toEqual(
      expect.arrayContaining(['backend', 'connect']),
    );
  });

  it('hides the backend for a deployment-only project', () => {
    expect(ids({ shape: 'DEPLOYMENT' })).not.toContain('backend');
  });

  it('hides the deploy group when the deployment service is off', () => {
    const items = ids({ shape: 'BOTH', deploymentOn: false });
    expect(items).not.toContain('deployments');
    expect(items).not.toContain('domains');
    // The backend is still there — it is not part of the deployment service.
    expect(items).toContain('backend');
  });

  it('shows functions only when the project has one', () => {
    expect(
      ids({ resources: { ...BASE.resources, functions: 0 } }),
    ).not.toContain('functions');
    expect(ids({ resources: { ...BASE.resources, functions: 2 } })).toContain(
      'functions',
    );
  });

  it('shows databases only when the project has one', () => {
    expect(
      ids({ resources: { ...BASE.resources, databases: 0 } }),
    ).not.toContain('databases');
    expect(ids({ resources: { ...BASE.resources, databases: 1 } })).toContain(
      'databases',
    );
  });

  it('shows a capability only when it is switched on', () => {
    expect(
      ids({ capabilities: { email: true, whatsapp: false, packages: false } }),
    ).toContain('email');
    expect(
      ids({ capabilities: { email: true, whatsapp: false, packages: false } }),
    ).not.toContain('whatsapp');
  });

  it('shows what can be observed only when something is emitting', () => {
    expect(ids({})).not.toContain('monitoring');
    expect(ids({ resources: { ...BASE.resources, deployments: 1 } })).toContain(
      'monitoring',
    );
  });

  it('hides the settings from anybody who cannot use it', () => {
    expect(ids({ role: 'owner' })).toContain('settings');
    expect(ids({ role: 'admin' })).toContain('settings');
    expect(ids({ role: 'developer' })).not.toContain('settings');
    expect(ids({ role: 'viewer' })).not.toContain('settings');
  });

  it('groups the items, and keeps the order', () => {
    const groups = groupMenuItems(buildProjectMenu({ ...BASE, shape: 'BOTH' }));
    expect(groups.map((group) => group.label)).toEqual([
      'Project',
      'Backend',
      'Deploy',
      'Settings',
    ]);
  });
});
