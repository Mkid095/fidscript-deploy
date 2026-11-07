/**
 * The shapes the platform serves.
 *
 * Only the ones this console uses. A shape is written down here when a
 * screen needs it, and it is checked against the API's answer when the API
 * changes.
 */

/** What a project is for. It is what the project's menu is derived from. */
export type ProjectShape = 'BACKEND' | 'DEPLOYMENT' | 'BOTH';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  mfaEnabled: boolean;
  mustChangePassword: boolean;
  preferredAuthMethod: 'PASSWORD' | 'MAGIC_CODE';
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  type: string;
  status: string;
  role?: string;
  ownerId?: string;
  subdomain?: string | null;
  /** What the project is for. */
  shape?: ProjectShape;
  /** Whether the deployment service is on for it. */
  deploymentOn?: boolean;
  lastActivityAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  updatedAt: string;
}

export interface DeploymentSummary {
  id: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
  status: string;
  deploymentUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AlertSummary {
  id: string;
  projectId: string;
  projectName: string;
  severity: string;
  status: string;
  message: string;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  eventType: string;
  resourceType: string;
  projectName: string | null;
  timestamp: string;
}

export interface PlatformOverview {
  projects: {
    total: number;
    byStatus: Record<string, number>;
    recent: ProjectSummary[];
  };
  deployments: {
    total: number;
    running: number;
    failed: number;
    recent: DeploymentSummary[];
    failures: DeploymentSummary[];
  };
  alerts: {
    firing: number;
    recent: AlertSummary[];
  };
  activity: ActivityEntry[];
}

/** One of the applications the platform can have. */
export interface Application {
  id: string;
  title: string;
  summary: string;
  kind: 'core' | 'add-on';
  installed: boolean;
  installable: boolean;
  /** Where its console is, when it has one. */
  url: string | null;
  requires: string[];
  icon: string;
  apiHost: string | null;
}

export interface Session {
  id: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  permissions: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

/** A project's Instant app — its data plane. */
export interface InstantApp {
  appId: string;
  title: string;
  status: string;
  createdAt: string;
}
