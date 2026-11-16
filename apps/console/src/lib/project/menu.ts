import type { ProjectShape } from '@/lib/api/types';

/**
 * The project's menu.
 *
 * It is **derived**, never a fixed list. Four inputs decide it:
 *
 *   1. the project's **shape** — a backend, something you deploy, or both;
 *   2. the **deployment switch**;
 *   3. the **capabilities** the project has switched on;
 *   4. what the project **actually has** — its functions, its databases, its
 *      deployments, its domains.
 *
 * And the rule that decides what to do with an empty project:
 *
 *   > **The menu shows what the project has. The overview shows what it
 *   > could have.**
 *
 * So a project with no database has no "Databases" item, and no function has
 * no "Functions" item — the overview offers to create them.
 */

export type ProjectRole = 'owner' | 'admin' | 'developer' | 'viewer';

export interface MenuCapabilities {
  email: boolean;
  whatsapp: boolean;
  packages: boolean;
}

export interface MenuResources {
  functions: number;
  databases: number;
  deployments: number;
  domains: number;
}

export interface MenuInput {
  /** The project's path — `/projects/<slug>`. */
  projectPath: string;
  shape: ProjectShape;
  deploymentOn: boolean;
  capabilities: MenuCapabilities;
  resources: MenuResources;
  role: ProjectRole;
}

export interface MenuItem {
  id: string;
  label: string;
  href: string;
  group: string;
  /** Only the owner and the admin see it. */
  adminOnly?: boolean;
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

/** Builds the menu for one project, for one person, right now. */
export function buildProjectMenu(input: MenuInput): MenuItem[] {
  const {
    projectPath: base,
    shape,
    deploymentOn,
    capabilities,
    resources,
    role,
  } = input;

  const items: MenuItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      href: `${base}/overview`,
      group: 'Project',
    },
    {
      id: 'members',
      label: 'Members',
      href: `${base}/members`,
      group: 'Project',
    },
    {
      id: 'activity',
      label: 'Activity',
      href: `${base}/activity`,
      group: 'Project',
    },
  ];

  // The backend — InstantDB's app for this project.
  if (shape === 'BACKEND' || shape === 'BOTH') {
    items.push(
      {
        id: 'backend',
        label: 'Backend',
        href: `${base}/backend`,
        group: 'Backend',
      },
      {
        id: 'connect',
        label: 'Connect',
        href: `${base}/connect`,
        group: 'Backend',
      },
    );
  }

  // The deployment service — only when it is switched on.
  if (deploymentOn) {
    items.push(
      {
        id: 'deployments',
        label: 'Deployments',
        href: `${base}/deployments`,
        group: 'Deploy',
      },
      {
        id: 'domains',
        label: 'Domains',
        href: `${base}/domains`,
        group: 'Deploy',
      },
    );
    if (resources.functions > 0) {
      items.push({
        id: 'functions',
        label: 'Functions',
        href: `${base}/functions`,
        group: 'Deploy',
      });
    }
    if (resources.databases > 0) {
      items.push({
        id: 'databases',
        label: 'Databases',
        href: `${base}/databases`,
        group: 'Deploy',
      });
    }
  }

  // The capabilities the project has switched on.
  if (capabilities.email) {
    items.push({
      id: 'email',
      label: 'Email',
      href: `${base}/email`,
      group: 'Capabilities',
    });
  }
  if (capabilities.whatsapp) {
    items.push({
      id: 'whatsapp',
      label: 'WhatsApp',
      href: `${base}/whatsapp`,
      group: 'Capabilities',
    });
  }
  if (capabilities.packages) {
    items.push({
      id: 'packages',
      label: 'Packages',
      href: `${base}/packages`,
      group: 'Capabilities',
    });
  }

  // What can be observed: something has to be emitting.
  if (
    resources.deployments > 0 ||
    capabilities.email ||
    capabilities.whatsapp
  ) {
    items.push(
      {
        id: 'monitoring',
        label: 'Monitoring',
        href: `${base}/monitoring`,
        group: 'Observe',
      },
      { id: 'logs', label: 'Logs', href: `${base}/logs`, group: 'Observe' },
    );
  }

  items.push({
    id: 'settings',
    label: 'Settings',
    href: `${base}/settings`,
    group: 'Settings',
    adminOnly: true,
  });

  // A menu item a person cannot use is hidden, not greyed out.
  const permitted = role === 'owner' || role === 'admin';
  return items.filter((item) => !item.adminOnly || permitted);
}

/** The items, grouped — the shape the sidebar renders. */
export function groupMenuItems(items: MenuItem[]): MenuGroup[] {
  const groups: MenuGroup[] = [];
  for (const item of items) {
    const group = groups.find((candidate) => candidate.label === item.group);
    if (group) group.items.push(item);
    else groups.push({ label: item.group, items: [item] });
  }
  return groups;
}
