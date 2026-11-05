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
}
