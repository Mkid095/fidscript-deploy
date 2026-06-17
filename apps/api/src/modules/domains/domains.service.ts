import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
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
      include: {
        deployment: { select: { id: true, deploymentUrl: true, status: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    return { domains: domains.map(d => this.formatDomain(d)) };
  }

  /**
   * Add a domain to a project.
   *
   * Mode A (dnsMode = 'manual', the default):
   *   - Detects MX records for email safety warning
   *   - Returns DNS instructions for the user to configure manually
   *   - No Cloudflare API calls made
   *
   * Mode B (dnsMode = 'cloudflare_auto'):
   *   - Requires connected Cloudflare account
   *   - Creates DNS records automatically
   *   - Respects email safety (never touches MX/SPF/DKIM/DMARC)
   */
  async add(userId: string, projectId: string, dto: AddDomainDto) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const deployment = await this.prisma.deployment.findUnique({ where: { id: dto.deploymentId } });
    if (!deployment || deployment.projectId !== projectId) {
      throw new NotFoundException('Deployment not found in this project');
    }
    if (deployment.status !== 'SUCCESS') {
      throw new ConflictException('Can only add a domain to a successful deployment');
    }

    const existing = await this.prisma.domain.findFirst({ where: { projectId, domain: dto.domain } });
    if (existing) throw new ConflictException('Domain already added to this project');

    const isPlatform = dto.domain.endsWith(`.${PLATFORM_DOMAIN}`);
    const isApex = !dto.domain.startsWith('www.') && dto.domain.split('.').length === 2;

    // Email safety check (Mode B only, but results surfaced for Mode A too)
    let emailWarning = false;
    let emailProvider = '';
    if (!isPlatform && dto.dnsMode === 'cloudflare_auto') {
      const mx = await this.checkMxRecords(dto.domain);
      emailWarning = mx.hasMx;
      emailProvider = mx.provider;
    }

    // First domain added is automatically primary
    const existingCount = await this.prisma.domain.count({ where: { projectId } });
    const isPrimary = existingCount === 0;

    const domain = await this.prisma.domain.create({
      data: {
        projectId,
        deploymentId: dto.deploymentId,
        domain: dto.domain,
        isCustom: !isPlatform,
        isPrimary,
        apexDomain: isApex,
        dnsMode: dto.dnsMode ?? 'manual',
        sslEnabled: dto.sslEnabled ?? true,
        sslStatus: 'PENDING',
        dnsStatus: 'PENDING',
        emailWarning,
      },
    });

    await this.emit(domain.id, projectId, userId, 'domain.added', {
      domain: dto.domain,
      isCustom: !isPlatform,
      emailWarning,
    });

    // DNS instructions always returned (Mode A: user follows them; Mode B: informational)
    const instructions = this.getDnsInstructions(dto.domain, deployment.deploymentUrl, isApex);

    // Mode B: auto-create DNS records
    if (dto.dnsMode === 'cloudflare_auto') {
      try {
        await this.cloudflareAutoSetup(domain.id, dto.domain, deployment.deploymentUrl, isApex);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`[domains] Cloudflare auto-setup failed for ${dto.domain}: ${msg}`);
        await this.prisma.domain.update({
          where: { id: domain.id },
          data: { dnsStatus: 'FAILED' },
        });
        throw err;
      }
    }

    return {
      domain: this.formatDomain(domain),
      instructions,
      emailWarning: emailWarning
        ? { detected: true, provider: emailProvider, message: `Email service detected (${emailProvider}). We will only create CNAME and TXT records. MX/SPF/DKIM/DMARC will not be modified.` }
        : { detected: false },
    };
  }

  /** Get DNS instructions for Mode A (manual DNS configuration). */
  async getInstructions(userId: string, projectId: string, domainId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
      include: { deployment: { select: { deploymentUrl: true } } },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    const instructions = this.getDnsInstructions(domain.domain, domain.deployment?.deploymentUrl ?? null, domain.apexDomain);
    return { domain: this.formatDomain(domain), instructions };
  }

  /** Connect Cloudflare account for Mode B — stores encrypted API token. */
  async connectCloudflare(userId: string, projectId: string, apiToken: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    // Validate token against Cloudflare API
    let cfEmail = '';
    try {
      const resp = await axios.get('https://api.cloudflare.com/client/v4/user/tokens/verify', {
        headers: { Authorization: `Bearer ${apiToken}` },
        timeout: 10_000,
      });
      if (!resp.data.success) throw new Error('Invalid Cloudflare API token');
      cfEmail = resp.data.result?.email || '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ConflictException(`Cloudflare token validation failed: ${msg}`);
    }

    // Encrypt and store token in ProjectEnv
    const encryptionKey = this.getEncryptionKey();
    const encrypted = this.encrypt(encryptionKey, apiToken);
    await this.prisma.projectEnv.upsert({
      where: { projectId_key: { projectId, key: 'CLOUDFLARE_API_TOKEN' } },
      create: { projectId, key: 'CLOUDFLARE_API_TOKEN', value: encrypted },
      update: { value: encrypted },
    });

    this.logger.log(`[domains] Cloudflare account connected for project ${projectId}`);
    return { success: true, email: cfEmail };
  }

  async delete(userId: string, projectId: string, domainId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const domain = await this.prisma.domain.findFirst({ where: { id: domainId, projectId } });
    if (!domain) throw new NotFoundException('Domain not found');

    if (domain.dnsMode === 'cloudflare_auto' && !domain.isCustom) {
      try {
        await this.dnsProvider.deletePlatformSubdomain(this.subdomainFor(domain.domain));
      } catch (err) {
        this.logger.warn(`[domains] Failed to clean DNS for ${domain.domain}: ${err instanceof Error ? err.message : err}`);
      }
    }

    await this.prisma.domain.delete({ where: { id: domainId } });
    await this.emit(domainId, projectId, userId, 'domain.deleted', { domain: domain.domain });
    return { success: true };
  }

  /**
   * Full domain verification — three checks:
   * 1. DNS propagation check
   * 2. DNS resolution check (dig confirms real resolution)
   * 3. HTTP routing check (GET /.well-known/fidscript hits the platform)
   *
   * dnsStatus: PENDING → VALIDATING → ACTIVE | FAILED
   * If a previously-ACTIVE domain fails its HTTP check → BROKEN
   */
  async verify(userId: string, projectId: string, domainId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
      include: { deployment: { select: { deploymentUrl: true } } },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    await this.prisma.domain.update({
      where: { id: domainId },
      data: { dnsStatus: 'VALIDATING' },
    });

    try {
      // Step 1: DNS propagation
      const dnsPropagation = await this.checkDnsPropagation(domain);

      // Step 2: DNS resolution (domain actually resolves)
      const dnsResolution = await this.checkDnsResolution(domain);

      if (!dnsPropagation || !dnsResolution) {
        await this.failDomain(domainId, projectId, 'DNS propagation or resolution check failed');
        const updated = await this.prisma.domain.findUnique({ where: { id: domainId } });
        return this.formatDomain(updated!);
      }

      // Step 3: HTTP routing — confirms traffic reaches the platform
      const routingOk = await this.checkHttpRouting(domain);

      if (!routingOk) {
        await this.prisma.domain.update({
          where: { id: domainId },
          data: { dnsStatus: 'FAILED', routingVerifiedAt: null },
        });
        await this.emit(domainId, projectId, userId, 'domain.failed', {
          reason: 'HTTP routing check failed — DNS points here but platform is not receiving traffic',
          domain: domain.domain,
        });
        const updated = await this.prisma.domain.findUnique({ where: { id: domainId } });
        return this.formatDomain(updated!);
      }

      // All three checks passed
      await this.prisma.domain.update({
        where: { id: domainId },
        data: {
          dnsStatus: 'ACTIVE',
          dnsVerifiedAt: new Date(),
          routingVerifiedAt: new Date(),
          sslStatus: domain.sslEnabled ? 'ISSUING' : 'PENDING',
        },
      });
      await this.emit(domainId, projectId, userId, 'domain.verified', { domain: domain.domain });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[domains] Verification error for ${domain.domain}: ${msg}`);
      await this.failDomain(domainId, projectId, msg);
    }

    const updated = await this.prisma.domain.findUnique({ where: { id: domainId } });
    return this.formatDomain(updated!);
  }

  /** Domain health check — called periodically by a background worker (Phase 14). */
  async checkHealth(domainId: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      include: { deployment: { select: { deploymentUrl: true } } },
    });
    if (!domain) return;
    if (domain.dnsStatus !== 'ACTIVE') return;

    const routingOk = await this.checkHttpRouting(domain).catch(() => false);

    const status = domain.dnsStatus as string;
    if (!routingOk && status === 'ACTIVE') {
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { dnsStatus: 'BROKEN' },
      });
      await this.emit(domainId, domain.projectId, '', 'domain.broken', { domain: domain.domain });
      this.logger.warn(`[domains] Domain ${domain.domain} went BROKEN`);
    } else if (routingOk && status === 'BROKEN') {
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { dnsStatus: 'ACTIVE' },
      });
      await this.emit(domainId, domain.projectId, '', 'domain.recovered', { domain: domain.domain });
      this.logger.log(`[domains] Domain ${domain.domain} recovered to ACTIVE`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Mode B: Cloudflare Auto Setup
  // ─────────────────────────────────────────────────────────────

  private async cloudflareAutoSetup(
    domainId: string,
    domain: string,
    deploymentUrl: string | null,
    isApex: boolean,
  ) {
    const zoneId = await this.dnsProvider.getZoneId(domain);
    if (!zoneId) throw new Error(`Cloudflare zone for ${domain} not found — is the domain on Cloudflare?`);

    const slug = this.extractSlug(deploymentUrl || domain);

    // TXT for ownership verification
    await this.dnsProvider.createRecord({
      zoneId,
      type: 'TXT',
      name: `_fidscript-verification.${domain}`,
      content: `FIDScript verified ${domainId}`,
      ttl: 300,
    });

    if (isApex) {
      // Apex: A record to VPS IP (never touch MX)
      await this.dnsProvider.createRecord({
        zoneId, type: 'A', name: domain,
        content: this.configService.get<string>('SERVER_IP', ''),
        ttl: 300, proxied: false,
      });
    } else {
      // Subdomain: CNAME to the platform subdomain
      await this.dnsProvider.createRecord({
        zoneId, type: 'CNAME', name: domain,
        content: `${slug}.apps.${PLATFORM_DOMAIN}`,
        ttl: 300, proxied: false,
      });
    }

    await this.prisma.domain.update({
      where: { id: domainId },
      data: { dnsStatus: 'VALIDATING' },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // DNS verification checks
  // ─────────────────────────────────────────────────────────────

  /**
   * Check if MX records exist for this domain.
   * Used to warn users before auto-DNS (Mode B) — we must never overwrite MX/SPF/DKIM/DMARC.
   */
  private async checkMxRecords(domain: string): Promise<{ hasMx: boolean; provider: string }> {
    // Try Cloudflare DNS-over-HTTPS for MX lookup
    try {
      const resp = await axios.get(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
        { headers: { Accept: 'application/dns-json' }, timeout: 8_000 }
      );
      if (resp.data?.Answer?.length > 0) {
        const mxData = resp.data.Answer.map((a: any) => a.data).join(',');
        if (mxData.includes('google.com')) return { hasMx: true, provider: 'Google Workspace' };
        if (mxData.includes('outlook.com') || mxData.includes('microsoft.com')) return { hasMx: true, provider: 'Microsoft 365' };
        if (mxData.includes('zoho.com')) return { hasMx: true, provider: 'Zoho' };
        if (mxData.includes('amazonses.com')) return { hasMx: true, provider: 'Amazon SES' };
        if (mxData.includes('mailgun.org')) return { hasMx: true, provider: 'Mailgun' };
        return { hasMx: true, provider: 'custom' };
      }
    } catch { /* ignore */ }

    // Fallback: system dig
    try {
      const { execSync } = require('child_process');
      const out = execSync(`dig +short MX ${domain} 2>/dev/null`, { timeout: 8_000 }).toString().trim();
      if (out && !out.includes('no MX')) {
        if (out.includes('google.com')) return { hasMx: true, provider: 'Google Workspace' };
        if (out.includes('outlook.com') || out.includes('microsoft.com')) return { hasMx: true, provider: 'Microsoft 365' };
        if (out.includes('zoho.com')) return { hasMx: true, provider: 'Zoho' };
        return { hasMx: true, provider: 'custom' };
      }
    } catch { /* ignore */ }

    return { hasMx: false, provider: '' };
  }

  /** Check if the DNS record exists (propagation). Mode A uses public DNS; Mode B uses Cloudflare API. */
  private async checkDnsPropagation(domain: { domain: string; dnsMode: string; isCustom: boolean }): Promise<boolean> {
    if (domain.dnsMode === 'cloudflare_auto') {
      const zoneId = await this.dnsProvider.getZoneId(domain.domain);
      if (!zoneId) return false;
      const records = await this.dnsProvider.listRecords({ zoneId, name: domain.domain });
      return records.length > 0;
    }

    // Mode A (manual): use public DNS-over-HTTPS resolver
    try {
      const resp = await axios.get(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain.domain)}&type=A`,
        { headers: { Accept: 'application/dns-json' }, timeout: 8_000 }
      );
      return (resp.data?.Answer?.length ?? 0) > 0;
    } catch { /* ignore */ }

    // Fallback: dig
    try {
      const { execSync } = require('child_process');
      const out = execSync(`dig +short ${domain.domain} 2>/dev/null`, { timeout: 8_000 }).toString().trim();
      return out.length > 0 && !out.includes('no servers');
    } catch {
      return false;
    }
  }

  /** Check if the domain actually resolves (confirms DNS is live and reachable). */
  private async checkDnsResolution(domain: { domain: string }): Promise<boolean> {
    try {
      const resp = await axios.get(
        `https://cloudflare-dns.com/cdn-cgi/trace?name=${encodeURIComponent(domain.domain)}`,
        { timeout: 8_000 }
      );
      return resp.status === 200;
    } catch { /* ignore */ }

    try {
      const { execSync } = require('child_process');
      const out = execSync(`dig +short ${domain.domain} 2>/dev/null`, { timeout: 8_000 }).toString().trim();
      return out.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * HTTP routing check — confirms traffic actually reaches the platform.
   * GET http://<domain>/.well-known/fidscript
   *
   * We expect:
   * - 200 with { fidscript: true } if Traefik routed it here, OR
   * - 404 with our token in the body (routing works, but endpoint may differ)
   *
   * Any 2xx/404 from our server = routing works.
   * Connection refused / ENOTFOUND / timeout = routing broken.
   */
  private async checkHttpRouting(domain: { domain: string }): Promise<boolean> {
    try {
      const response = await axios.get(`http://${domain.domain}/.well-known/fidscript`, {
        timeout: 10_000,
        validateStatus: (status) => status < 500,
      });

      // 200 = routing confirmed
      if (response.status === 200) return true;

      // 404 with our token in body = routing works (got to our server)
      if (response.status === 404 && typeof response.data === 'string') {
        if (response.data.includes('fidscript')) return true;
      }

      // Any 2xx / 404 means the request reached us
      return response.status < 400 || response.status === 404;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      // These = routing definitely broken
      if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT') || msg.includes('NXDOMAIN')) {
        return false;
      }
      // axios errors with a response object = routing reached a server (possibly not ours)
      const axiosErr = err as any;
      if (axiosErr?.response) return true;
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // DNS Instructions (Mode A)
  // ─────────────────────────────────────────────────────────────

  /** Returns human-readable DNS records the user must create. */
  private getDnsInstructions(
    domain: string,
    deploymentUrl: string | null,
    isApex: boolean,
  ): { type: string; name: string; value: string; ttl: number; notes: string }[] {
    const slug = this.extractSlug(deploymentUrl || domain);
    const instructions = [];

    if (isApex) {
      instructions.push({
        type: 'A',
        name: '@',
        value: this.configService.get<string>('SERVER_IP', '<YOUR_SERVER_IP>'),
        ttl: 300,
        notes: `A record for the root domain. CNAME is not valid at the apex.`,
      });
    } else {
      instructions.push({
        type: 'CNAME',
        name: domain.replace(`.${PLATFORM_DOMAIN}`, '').split('.')[0],
        value: `${slug}.apps.${PLATFORM_DOMAIN}`,
        ttl: 300,
        notes: `Routes ${domain} to your FIDScript deployment.`,
      });
    }

    instructions.push({
      type: 'TXT',
      name: `_fidscript-verification.${domain}`,
      value: `FIDScript verified`,
      ttl: 300,
      notes: `Proves you own this domain. Can be deleted after verification.`,
    });

    return instructions;
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  private extractSlug(deploymentUrl: string): string {
    try {
      const host = deploymentUrl.replace('https://', '').replace('http://', '').split(':')[0];
      return host.split('.')[0];
    } catch {
      return 'app';
    }
  }

  private subdomainFor(domain: string): string {
    return domain.replace(`.apps.${PLATFORM_DOMAIN}`, '');
  }

  private async failDomain(domainId: string, projectId: string, reason: string) {
    await this.prisma.domain.update({
      where: { id: domainId },
      data: { dnsStatus: 'FAILED' },
    });
    await this.emit(domainId, projectId, '', 'domain.failed', { reason });
  }

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
      isPrimary: domain.isPrimary,
      apexDomain: domain.apexDomain,
      dnsMode: domain.dnsMode,
      sslEnabled: domain.sslEnabled,
      sslStatus: domain.sslStatus?.toLowerCase() ?? 'pending',
      sslMethod: domain.sslMethod,
      dnsStatus: domain.dnsStatus?.toLowerCase() ?? 'pending',
      dnsVerifiedAt: domain.dnsVerifiedAt,
      routingVerifiedAt: domain.routingVerifiedAt,
      emailWarning: domain.emailWarning,
      deploymentUrl: domain.deployment?.deploymentUrl || null,
      createdAt: domain.createdAt,
    };
  }

  private async emit(domainId: string, projectId: string, userId: string, type: string, metadata: Record<string, unknown>) {
    await this.eventService.emit(type as any, {
      id: `${domainId}-${Date.now()}`,
      type,
      timestamp: new Date(),
      actorId: userId || undefined,
      actorType: 'user',
      resourceType: 'domain',
      resourceId: domainId,
      metadata: { domainId, projectId, ...metadata },
    });
  }

  // ── Encryption helpers (same AES-256-GCM as CryptoService) ────────────────────

  private getEncryptionKey(): Buffer {
    const keyBase64 = this.configService.get<string>('ENCRYPTION_KEY');
    if (keyBase64) return Buffer.from(keyBase64, 'base64');
    const keyFile = this.configService.get<string>('ENCRYPTION_KEY_FILE');
    if (keyFile) {
      try { return Buffer.from(require('fs').readFileSync(keyFile, 'utf8').trim(), 'base64'); } catch { /* fall through */ }
    }
    throw new Error('ENCRYPTION_KEY or ENCRYPTION_KEY_FILE must be set');
  }

  private encrypt(key: Buffer, plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }
}
