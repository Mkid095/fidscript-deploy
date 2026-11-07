import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { InstantClientService } from './instant-client.service';

/**
 * What a deployed application needs to reach its project's data plane.
 *
 * The admin token is deliberately absent: it is the platform's credential,
 * not the application's. An application authenticates with its own user
 * token, and Instant evaluates its permission rules.
 */
export interface InstantAppConfig {
  apiHost: string;
  dashboardUrl: string;
  appId: string;
}

/**
 * Serves the bridge between a project's Instant app and the application
 * deployed alongside it.
 */
@Injectable()
export class InstantAppConfigService {
  constructor(
    private prisma: PrismaService,
    private client: InstantClientService,
  ) {}

  /** Whether the platform can reach Instant and holds a token to do it with. */
  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  /** The Instant console — where the operator manages the app's schema,
   *  permissions and users. Empty when it is not configured. */
  dashboardUrl(): string {
    return this.client.dashboardUrl;
  }

  /** The configuration a deployed application needs. */
  async forProject(projectId: string): Promise<InstantAppConfig> {
    const row = await this.prisma.projectInstantApp.findUnique({
      where: { projectId },
    });
    if (!row) throw new NotFoundException(`Project ${projectId} has no Instant app`);

    return {
      apiHost: this.client.publicApiHost,
      dashboardUrl: this.client.dashboardUrl,
      appId: row.appId,
    };
  }

  /**
   * The environment a deployed application needs to reach its data plane.
   *
   * The names are the ones Instant's own SDK reads — `INSTANT_API_URI` and
   * its siblings — so an application connects with no configuration of its
   * own. Null when the project has no Instant app, which is the same as
   * "there is nothing to connect to".
   */
  async environmentFor(projectId: string): Promise<Record<string, string> | null> {
    const row = await this.prisma.projectInstantApp.findUnique({
      where: { projectId },
    });
    if (!row) return null;

    const apiHost = this.client.publicApiHost;
    const dashboardUrl = this.client.dashboardUrl;
    if (!apiHost) return null;

    return {
      INSTANT_APP_ID: row.appId,
      INSTANT_API_URI: apiHost,
      // The realtime socket is the same host over a different scheme, and
      // the path is Instant's session endpoint.
      INSTANT_WS_URI: `${apiHost.replace(/^http/, 'ws')}/runtime/session`,
      // Instant serves its storage routes from the API host.
      INSTANT_STORAGE_URI: apiHost,
      INSTANT_DASH_URI: dashboardUrl,
    };
  }
}
