import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { DnsProvider } from './providers/dns-provider.interface';
import { AddDomainDto } from './dto/index';

const PLATFORM_DOMAIN = 'deploy.fidscript.com';

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
    @Inject('DNS_PROVIDER') private dnsProvider: DnsProvider,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────

  async list(userId: string, projectId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const domains = await this.prisma.domain.findMany({
      where: { projectId },
      include: { deployment: { select: { id: true, deploymentUrl: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return { domains: domains.map(d => this.formatDomain(d)) };
  }

  /**
   * Add a domain to a project and trigger DNS setup.
   *
   * For platform subdomains (e.g. demo.apps.deploy.fidscript.com):
   *   - Creates the DNS A record in Cloudflare immediately
   *   - Marks domain as VALIDATING (waiting for Traefik cert)
   *
   * For custom domains (e.g. app.example.com):
   *   - Creates a TXT verification record in Cloudflare
   *   - Marks domain as VALIDATING — user must still add the CNAME
   *   - They add the CNAME pointing to our platform, then we verify
   *
   * @param deploymentId — which deployment this domain routes to (required for routing)
   */
  async add(userId: string, projectId: string, dto: AddDomainDto, deploymentId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    // Validate deploymentId: must exist, belong to this project, be SUCCESS
    const deployment = await this.prisma.deployment.findUnique({ where: { id: deploymentId } });
    if (!deployment || deployment.projectId !== projectId) {
      throw new NotFoundException('Deployment not found in this project');
    }
    if (deployment.status !== 'SUCCESS') {
      throw new ConflictException('Can only add a domain to a successful deployment');
    }

    // Check for duplicate
    const existing = await this.prisma.domain.findFirst({
      where: { projectId, domain: dto.domain },
    });
    if (existing) {
      throw new ConflictException('Domain already added to this project');
    }

    const isPlatform = dto.domain.endsWith(`.${PLATFORM_DOMAIN}`);

    // Create the domain record
    const domain = await this.prisma.domain.create({
      data: {
        projectId,
        deploymentId,
        domain: dto.domain,
        isCustom: !isPlatform,
        sslEnabled: dto.sslEnabled ?? true,
        dnsStatus: 'PENDING',
      },
    });

    await this.eventService.emit('domain.added' as any, {
      id: `${domain.id}-${Date.now()}`,
      type: 'domain.added' as any,
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'domain',
      resourceId: domain.id,
      metadata: { domainId: domain.id, projectId, domain: dto.domain, isCustom: !isPlatform },
    });

    this.logger.log(`[domains] Domain ${dto.domain} added for project ${projectId}`);

    // ── Set up DNS based on domain type ──────────────────────
    if (isPlatform) {
      // Platform subdomain: create DNS A record in Cloudflare
      await this.setupPlatformSubdomain(domain.id, dto.domain, projectId, deployment);
    } else {
      // Custom domain: issue a TXT verification record for ownership check
      await this.setupCustomDomain(domain.id, dto.domain, projectId);
    }

    return {
      domain: this.formatDomain(domain),
    };
  }

  /**
   * Delete a domain and clean up DNS records.
   * For platform subdomains: deletes the Cloudflare DNS record.
   * For custom domains: just removes the record (user manages their own DNS).
   */
  async delete(userId: string, projectId: string, domainId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    // Clean up DNS record if this is a platform subdomain
    if (!domain.isCustom) {
      try {
        await this.cleanupPlatformSubdomain(domain.domain);
      } catch (err) {
        this.logger.warn(`[domains] Failed to clean up DNS for ${domain.domain}: ${err instanceof Error ? err.message : err}`);
      }
    }

    await this.prisma.domain.delete({ where: { id: domainId } });

    await this.eventService.emit('domain.deleted' as any, {
      id: `${domainId}-${Date.now()}`,
      type: 'domain.deleted' as any,
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'domain',
      resourceId: domainId,
      metadata: { domainId, projectId, domain: domain.domain },
    });

    return { success: true };
  }

  /**
   * Verify domain DNS configuration.
   *
   * For platform subdomains: polls Cloudflare until the A record is live,
   * then marks dnsStatus = VALID.
   *
   * For custom domains: polls Cloudflare until the TXT record is found
   * (ownership verification), then marks dnsStatus = VALID.
   * The CNAME verification for routing is handled by Traefik ACME.
   */
  async verify(userId: string, projectId: string, domainId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    // Mark as validating while we poll
    if (domain.dnsStatus === 'PENDING') {
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { dnsStatus: 'VALIDATING' },
      });
    }

    const isPlatform = !domain.isCustom;
    let verified = false;

    if (isPlatform) {
      verified = await this.verifyPlatformSubdomain(domain.domain);
    } else {
      verified = await this.verifyCustomDomain(domain.domain);
    }

    if (verified) {
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { dnsStatus: 'VALID', dnsVerifiedAt: new Date() },
      });

      await this.eventService.emit('domain.verified' as any, {
        id: `${domainId}-${Date.now()}`,
        type: 'domain.verified' as any,
        timestamp: new Date(),
        actorId: userId,
        actorType: 'user',
        resourceType: 'domain',
        resourceId: domainId,
        metadata: { domainId, projectId, domain: domain.domain },
      });
    } else {
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { dnsStatus: 'FAILED' },
      });

      await this.eventService.emit('domain.failed' as any, {
        id: `${domainId}-${Date.now()}`,
        type: 'domain.failed' as any,
        timestamp: new Date(),
        actorId: userId,
        actorType: 'user',
        resourceType: 'domain',
        resourceId: domainId,
        metadata: { domainId, projectId, domain: domain.domain },
      });
    }

    const updated = await this.prisma.domain.findUnique({ where: { id: domainId } });
    return this.formatDomain(updated!);
  }

  // ─────────────────────────────────────────────────────────────
  // DNS setup — platform subdomains
  // ─────────────────────────────────────────────────────────────

  /**
   * Set up DNS for a platform subdomain:
   *   <slug>.apps.deploy.fidscript.com → A → SERVER_IP
   *
   * The Traefik router for this domain will be configured in dynamic.yml
   * (or dynamically via the file provider) once dnsStatus = VALID.
   */
  private async setupPlatformSubdomain(
    domainId: string,
    domain: string,
    projectId: string,
    deployment: { id: string; deploymentUrl: string | null },
  ) {
    // Extract subdomain part: "demo" from "demo.apps.deploy.fidscript.com"
    const subdomain = domain.replace(`.apps.${PLATFORM_DOMAIN}`, '');

    try {
      await this.dnsProvider.createPlatformSubdomain(subdomain);
      this.logger.log(`[domains] DNS A record created for platform subdomain: ${domain}`);

      // Poll for propagation (up to 60s, polling every 5s)
      const verified = await this.pollDnsVerification(domain, 'A', /* allowProxy */ false);
      if (verified) {
        await this.prisma.domain.update({
          where: { id: domainId },
          data: { dnsStatus: 'VALID', dnsVerifiedAt: new Date() },
        });
        this.logger.log(`[domains] Platform subdomain DNS verified: ${domain}`);
      } else {
        // DNS record was created but not yet propagated — leave as VALIDATING
        this.logger.warn(`[domains] DNS record created for ${domain} but not yet propagated (will retry on verify call)`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[domains] Failed to create DNS record for ${domain}: ${msg}`);
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { dnsStatus: 'FAILED' },
      });
      throw err;
    }
  }

  private async cleanupPlatformSubdomain(domain: string) {
    const subdomain = domain.replace(`.apps.${PLATFORM_DOMAIN}`, '');
    await this.dnsProvider.deletePlatformSubdomain(subdomain);
    this.logger.log(`[domains] DNS record cleaned up for platform subdomain: ${domain}`);
  }

  private async verifyPlatformSubdomain(domain: string): Promise<boolean> {
    const subdomain = domain.replace(`.apps.${PLATFORM_DOMAIN}`, '');
    const serverIp = this.configService.get<string>('SERVER_IP', '');

    // Verify A record exists: subdomain.apps.deploy.fidscript.com → SERVER_IP
    return this.pollDnsVerification(domain, 'A', /* allowProxy */ false);
  }

  // ─────────────────────────────────────────────────────────────
  // DNS setup — custom domains
  // ─────────────────────────────────────────────────────────────

  /**
   * Set up a TXT record for custom domain ownership verification.
   * The user then adds their CNAME pointing to our platform.
   */
  private async setupCustomDomain(domainId: string, domain: string, projectId: string) {
    const verificationToken = `_fidscript-verification.${domain}`;
    const txtValue = `FIDScript verified domain ${domainId}`;

    try {
      const zoneId = await this.dnsProvider.getZoneId(domain);
      if (!zoneId) {
        throw new Error(`Cloudflare zone for ${domain} not found — custom domain may not be on Cloudflare`);
      }

      await this.dnsProvider.createRecord({
        zoneId,
        type: 'TXT',
        name: verificationToken,
        content: txtValue,
        ttl: 300,
      });

      this.logger.log(`[domains] TXT verification record created for custom domain: ${domain}`);
      this.logger.log(`[domains] User must add: ${domain} CNAME → <deployment-url>`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[domains] Failed to create TXT record for custom domain ${domain}: ${msg}`);
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { dnsStatus: 'FAILED' },
      });
      throw err;
    }
  }

  private async verifyCustomDomain(domain: string): Promise<boolean> {
    const verificationToken = `_fidscript-verification.${domain}`;
    const txtValue = `FIDScript verified domain`;

    try {
      const zoneId = await this.dnsProvider.getZoneId(domain);
      if (!zoneId) return false;

      return this.dnsProvider.verifyRecord({
        zoneId,
        name: verificationToken,
        type: 'TXT',
        expectedContent: txtValue,
      });
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // DNS polling helpers
  // ─────────────────────────────────────────────────────────────

  /**
   * Poll DNS until the expected record is found (or timeout).
   * Uses Cloudflare API directly for fast, accurate results (not public resolvers).
   */
  private async pollDnsVerification(
    fullDomain: string,
    type: 'A' | 'TXT' | 'CNAME',
    allowProxy: boolean,
    maxAttempts = 12,
    intervalMs = 5_000,
  ): Promise<boolean> {
    const zoneId = await this.dnsProvider.getZoneId(PLATFORM_DOMAIN);
    if (!zoneId) return false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const records = await this.dnsProvider.listRecords({ zoneId, name: fullDomain, type });

        if (records.length > 0) {
          this.logger.log(`[domains] DNS ${type} record found for ${fullDomain} on attempt ${attempt}`);
          return true;
        }
      } catch (err) {
        this.logger.warn(`[domains] DNS poll attempt ${attempt} failed: ${err instanceof Error ? err.message : err}`);
      }

      if (attempt < maxAttempts) {
        await sleep(intervalMs);
      }
    }

    this.logger.warn(`[domains] DNS ${type} record for ${fullDomain} not found after ${maxAttempts} attempts`);
    return false;
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  private async checkAccess(userId: string, projectId: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return false;
    if (project.ownerId === userId) return true;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    return !!member;
  }

  private formatDomain(domain: any) {
    return {
      id: domain.id,
      projectId: domain.projectId,
      deploymentId: domain.deploymentId || null,
      domain: domain.domain,
      isCustom: domain.isCustom,
      sslEnabled: domain.sslEnabled,
      dnsStatus: domain.dnsStatus?.toLowerCase() ?? 'pending',
      dnsVerifiedAt: domain.dnsVerifiedAt,
      deploymentUrl: domain.deployment?.deploymentUrl || null,
      createdAt: domain.createdAt,
    };
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
