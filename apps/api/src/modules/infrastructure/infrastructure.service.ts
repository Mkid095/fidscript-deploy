import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { DomainPrimitive } from './primitives/domain.primitive';
import { CloudflarePrimitive } from './primitives/cloudflare.primitive';
import { EmailPrimitive, EmailConfig } from './primitives/email.primitive';
import { SecretsService } from './secrets/secrets.service';
import { CredentialsService } from './credentials/credentials.service';

/**
 * InfrastructureService — the public facade for the Infrastructure layer.
 *
 * One method, one purpose: `getProjectInfrastructure(projectId)` returns
 * a normalized view of the project's infrastructure that every other
 * service consumes. No service should be reading from `prisma.domain` or
 * `prisma.environment` directly — they all go through here.
 *
 * The shape is intentionally flat. Each field is a primitive (a value
 * or a thin object). Consumers destructure the fields they need.
 */
export interface ProjectInfrastructure {
  projectId: string;
  primaryDomain: {
    id: string;
    name: string;
    zoneDomain: string | null;
    isCustom: boolean;
    isPrimary: boolean;
    apexDomain: boolean;
    capabilities: Record<string, boolean>;
    dnsStatus: string;
    sslStatus: string;
  } | null;
  cloudflare: {
    connected: boolean;
    zoneId: string | null;
    source: 'secret' | 'domain_connection' | null;
  };
  email: EmailConfig | null;
  region: 'us-east-1' | 'eu-west-1'; // single-region for now
}

@Injectable()
export class InfrastructureService {
  constructor(
    private prisma: PrismaService,
    private domainPrimitive: DomainPrimitive,
    private cloudflarePrimitive: CloudflarePrimitive,
    private emailPrimitive: EmailPrimitive,
    private secrets: SecretsService,
    private credentials: CredentialsService,
  ) {}

  /**
   * Get the project's full infrastructure view. Throws NotFoundException
   * if the project doesn't exist.
   */
  async getProjectInfrastructure(projectId: string): Promise<ProjectInfrastructure> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found.`);

    const primaryDomain = await this.domainPrimitive.getPrimaryDomain(projectId);
    const cloudflare = await this.cloudflarePrimitive.getConnection(projectId);
    const email = primaryDomain ? await this.emailPrimitive.getConfig(projectId) : null;

    return {
      projectId,
      primaryDomain: primaryDomain
        ? {
            id: primaryDomain.id,
            name: primaryDomain.domain,
            zoneDomain: primaryDomain.zoneDomain ?? null,
            isCustom: primaryDomain.isCustom,
            isPrimary: primaryDomain.isPrimary,
            apexDomain: primaryDomain.apexDomain,
            capabilities: (primaryDomain.capabilities as Record<string, boolean>) ?? {},
            dnsStatus: primaryDomain.dnsStatus,
            sslStatus: primaryDomain.sslStatus,
          }
        : null,
      cloudflare: {
        connected: !!cloudflare,
        zoneId: cloudflare?.zoneId ?? null,
        source: cloudflare?.source ?? null,
      },
      email,
      region: 'us-east-1', // stub — single-region deployment for now
    };
  }

  // ── Convenience methods (delegate to primitives) ────────────────

  async getEmailConfig(projectId: string): Promise<EmailConfig | null> {
    return this.emailPrimitive.getConfig(projectId);
  }

  async getDnsProvider(projectId: string) {
    return this.cloudflarePrimitive.getDnsProvider(projectId);
  }

  async getSecret(projectId: string | null, key: string): Promise<string> {
    return this.secrets.get(projectId, key);
  }

  async tryGetSecret(projectId: string | null, key: string): Promise<string | null> {
    return this.secrets.tryGet(projectId, key);
  }
}
