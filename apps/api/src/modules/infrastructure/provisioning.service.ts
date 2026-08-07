import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CredentialsService } from './credentials/credentials.service';

/**
 * ProvisioningService — the single entry point for project creation.
 *
 * The platform rule: every project goes through this service. UI, CLI,
 * MCP, and SDK all call `ProvisioningService.createProject({...})`.
 *
 * What gets provisioned:
 *   1. The `Project` row (the foundation).
 *   2. A default `*.deploy.fidscript.com` subdomain, marked as primary.
 *   3. Three environment shells (development, preview, production).
 *   4. Owner membership with the `OWNER` role.
 *   5. A default project API key with all standard scopes.
 *
 * What this does NOT do (deferred to other slices):
 *   - Database default tables — database-service plan
 *   - Default storage bucket — storage-service plan
 *   - Default realtime channel — realtime-service plan
 *   - Default email domain — happens lazily when the user connects Cloudflare
 */
@Injectable()
export class ProvisioningService {
  private readonly logger = new Logger(ProvisioningService.name);

  constructor(
    private prisma: PrismaService,
    private credentials: CredentialsService,
  ) {}

  /**
   * Create a new project and provision its default infrastructure.
   * Returns the project + the default API key plaintext (one-time
   * display, never persisted in plaintext).
   */
  async createProject(input: {
    ownerId: string;
    name: string;
    slug: string;
    description?: string;
    type?: 'FRONTEND' | 'BACKEND' | 'WORKER';
  }): Promise<{
    project: { id: string; name: string; slug: string };
    defaultApiKey: string;
    primarySubdomain: string;
  }> {
    const project = await this.prisma.project.create({
      data: {
        ownerId: input.ownerId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        type: input.type ?? 'FRONTEND',
      },
    });

    // Default *.deploy.fidscript.com subdomain as primary
    const primarySubdomain = `${input.slug}.deploy.fidscript.com`;
    await this.prisma.domain.create({
      data: {
        projectId: project.id,
        domain: primarySubdomain,
        isCustom: false,
        isPrimary: true,
        apexDomain: false,
        zoneDomain: 'deploy.fidscript.com',
        dnsMode: 'cloudflare_auto',
        capabilities: {
          deployment: true,
          email: false,
          inboundEmail: false,
          tracking: false,
          api: false,
          redirect: false,
          sandbox: false,
        },
        dnsStatus: 'PENDING',
        sslStatus: 'PENDING',
      },
    });

    // Default environment shells (dev/preview/prod)
    const envs = ['development', 'preview', 'production'] as const;
    for (const env of envs) {
      await this.prisma.projectEnv.create({
        data: {
          projectId: project.id,
          key: `__env_${env}`,
          value: '',
        },
      });
    }

    // Default project API key with all standard scopes
    const { secret: defaultApiKey } = await this.credentials.issueDefaultProjectKey(
      project.id,
      input.name,
    );

    this.logger.log(`Project ${project.slug} (${project.id}) provisioned with default key.`);

    return {
      project: { id: project.id, name: project.name, slug: project.slug },
      defaultApiKey,
      primarySubdomain,
    };
  }
}
