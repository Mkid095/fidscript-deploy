/**
 * The platform overview — the signed-in landing page's data.
 *
 * It is the **caller's** view: their projects, their deployments, their
 * alerts and their activity. Nothing in it counts over the platform as a
 * whole.
 */
export interface OverviewProject {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  updatedAt: string;
}

export interface OverviewDeployment {
  id: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
  status: string;
  deploymentUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface OverviewAlert {
  id: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
  severity: string;
  status: string;
  message: string;
  createdAt: string;
  firedAt: string | null;
}

export interface OverviewActivity {
  id: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  projectName: string | null;
  timestamp: string;
  metadata: unknown;
}

export interface PlatformOverview {
  projects: {
    total: number;
    byStatus: Record<string, number>;
    recent: OverviewProject[];
  };
  deployments: {
    total: number;
    running: number;
    failed: number;
    recent: OverviewDeployment[];
    failures: OverviewDeployment[];
  };
  alerts: {
    firing: number;
    recent: OverviewAlert[];
  };
  activity: OverviewActivity[];
}

export class OverviewModule {
  constructor(private client: { get: <T>(path: string) => Promise<T> }) {}

  /** The caller's projects, deployments, alerts and activity. */
  async get(): Promise<PlatformOverview> {
    return this.client.get<PlatformOverview>('/api/v1/overview');
  }
}
