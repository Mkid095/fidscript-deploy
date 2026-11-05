import { FidscriptClient } from '../client';

/** An application an operator can have on a platform. */
export interface Application {
  id: string;
  title: string;
  summary: string;
  /** Part of the platform, or an add-on the operator installs. */
  kind: 'core' | 'add-on';
  /** Whether it is installed on this platform. */
  installed: boolean;
  /** Whether the operator can install it from the applications screen. */
  installable: boolean;
  /** Where its console is, or null when it has none. */
  url: string | null;
  /** What has to be installed before this one can be. */
  requires: string[];
  /** The icon the dashboard draws. */
  icon: string;
  /** The application's own API host, when it speaks one over HTTP. */
  apiHost: string | null;
  /** The application's own MCP server, when it has one. */
  mcp: { package: string; env: Record<string, string> } | null;
}

/** One install, running or finished. */
export interface InstallJob {
  id: string;
  applicationId: string;
  status: 'running' | 'succeeded' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  /** The installer's own output. */
  output: string;
  error: string | null;
}

/**
 * The applications an operator can have on a platform.
 *
 * The deployment engine and the mail server are part of the platform and are
 * always there. The rest are installed from here, one at a time, by the
 * operator's choice — and an installed application opens on its own
 * subdomain.
 */
export class ApplicationsModule {
  constructor(private client: FidscriptClient) {}

  /** Every application on this platform, and which are installed. */
  async list(): Promise<{ applications: Application[] }> {
    return this.client.get('/api/v1/applications');
  }

  /** The installs currently running, and the ones that just finished. */
  async installs(): Promise<{ installs: InstallJob[] }> {
    return this.client.get('/api/v1/applications/installs');
  }

  /** The most recent install of one application. */
  async installStatus(applicationId: string): Promise<{ install: InstallJob | null }> {
    return this.client.get(`/api/v1/applications/${applicationId}/install`);
  }

  /** Start an install. It returns immediately — the work happens in the background. */
  async install(applicationId: string): Promise<{ install: InstallJob }> {
    return this.client.post(`/api/v1/applications/${applicationId}/install`);
  }
}
