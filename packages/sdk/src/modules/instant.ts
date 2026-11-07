import { FidscriptClient } from '../client';

/** The Instant app behind a project. */
export interface InstantAppStatus {
  appId: string;
  title: string;
  status: string;
  createdAt: string;
}

/**
 * The configuration a deployed application needs to reach its data plane.
 *
 * The admin token is deliberately absent — it is the platform's credential,
 * not the application's. An application authenticates with its own user
 * token, and Instant evaluates its permission rules.
 */
export interface InstantClientConfig {
  apiHost: string;
  dashboardUrl: string;
  appId: string;
}

/**
 * The Instant BaaS — the project's data plane.
 *
 * Instant owns the application's tables, users, permissions and files. This
 * module is the operator's side of that seam: it provisions the app and
 * reports what a deployed application needs to talk to it.
 *
 * The application-facing half — `db.query`, `db.tx`, the realtime
 * subscription — is Instant's own SDK, not this one.
 */
export class InstantModule {
  constructor(private client: FidscriptClient) {}

  /** Whether Instant is available, and whether the project has an app. */
  async get(projectId: string): Promise<{
    available: boolean;
    dashboardUrl: string;
    app: InstantAppStatus | null;
  }> {
    return this.client.get(`/api/v1/projects/${projectId}/instant`);
  }

  /** Provision an Instant app for the project. */
  async provision(projectId: string, title?: string): Promise<InstantAppStatus> {
    return this.client.post(`/api/v1/projects/${projectId}/instant`, { title });
  }

  /** Delete the project's Instant app and everything in it. */
  async unlink(projectId: string): Promise<{ deleted: boolean }> {
    return this.client.delete(`/api/v1/projects/${projectId}/instant`);
  }

  /** The configuration a deployed application needs to reach its data plane. */
  async clientConfig(projectId: string): Promise<InstantClientConfig> {
    return this.client.get(`/api/v1/projects/${projectId}/instant/config`);
  }
}
