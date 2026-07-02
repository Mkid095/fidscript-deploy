import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DnsProvider } from '@/modules/domains/providers/dns-provider.interface';
import { DomainSslService } from './domain-ssl.service';
import { DomainEmailKeyService } from './domain-email-key.service';
import { DomainRepairPlannerService, RepairType } from './domain-repair-planner.service';

export type RepairStatus = 'planned' | 'approved' | 'running' | 'completed' | 'failed' | 'requires_approval';

export interface RepairResult {
  repairRunId: string;
  status: RepairStatus;
  actionsPerformed: RepairType[];
  success: boolean;
  error: string | null;
}

/**
 * DomainRepairExecutorService
 *
 * Executes repair plans produced by DomainRepairPlannerService.
 *
 * Repair levels:
 * - Level 1: Creates incident, waits for user approval, executes on approval
 * - Level 2: Auto-executes based on domain policy
 *
 * Repair types supported:
 * - SSL: ssl_renewal, ssl_reissue
 * - DNS: dns_txt_recreated, dns_cname_recreated, dns_a_recreated, dns_aaaa_recreated
 * - Email: mx_recreated, spf_recreated, dmarc_recreated, dkim_recreated
 */
@Injectable()
export class DomainRepairExecutorService {
  private readonly logger = new Logger(DomainRepairExecutorService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private ssl: DomainSslService,
    private emailKeyService: DomainEmailKeyService,
    @Inject('DNS_PROVIDER') private dnsProvider: DnsProvider,
  ) {}

  // ── Public entry point ──────────────────────────────────────────────────────

  /**
   * Execute a repair plan for a domain.
   * Called by the repair queue worker after approval (or auto-approved by policy).
   */
  async executeRepair(
    domainId: string,
    plan: { actions: Array<{ type: RepairType }> },
    incidentId?: string | null,
  ): Promise<RepairResult> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      include: { dnsConnection: true, deployment: { select: { deploymentUrl: true } } },
    });
    if (!domain) throw new Error(`Domain ${domainId} not found`);

    // Create repair run record
    const repairRun = await this.prisma.domainRepairRun.create({
      data: {
        domainId,
        incidentId: incidentId ?? null,
        repairType: plan.actions.map(a => a.type).join(','),
        status: 'running',
        beforeState: {},
      },
    });

    await this.emit(domainId, domain.projectId, 'domains.repair.started', {
      repairRunId: repairRun.id,
      domain: domain.domain,
      actions: plan.actions.map(a => a.type),
    });

    const actionsPerformed: RepairType[] = [];
    let success = true;
    let error: string | null = null;

    for (const action of plan.actions) {
      try {
        await this.executeAction(domain, action.type);
        actionsPerformed.push(action.type);
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : String(err);
        this.logger.error(`[repair-executor] action ${action.type} failed: ${error}`);
        break;
      }
    }

    const status: RepairStatus = success ? 'completed' : 'failed';
    await this.prisma.domainRepairRun.update({
      where: { id: repairRun.id },
      data: {
        status,
        afterState: { actionsPerformed, success },
        error,
        completedAt: new Date(),
      },
    });

    if (success) {
      await this.emit(domainId, domain.projectId, 'domains.repair.completed', {
        repairRunId: repairRun.id,
        domain: domain.domain,
        actions: actionsPerformed,
      });
      // Resolve incident if one was linked
      if (incidentId) {
        await this.prisma.domainIncident.update({
          where: { id: incidentId },
          data: { status: 'resolved', resolvedAt: new Date() },
        });
        await this.emit(domainId, domain.projectId, 'domains.incident.resolved', {
          domain: domain.domain,
          incidentId,
          repairedBy: repairRun.id,
        });
      }
    } else {
      await this.emit(domainId, domain.projectId, 'domains.repair.failed', {
        repairRunId: repairRun.id,
        domain: domain.domain,
        actions: actionsPerformed,
        error,
      });
    }

    return { repairRunId: repairRun.id, status, actionsPerformed, success, error };
  }

  // ── Action dispatch ─────────────────────────────────────────────────────────

  private async executeAction(
    domain: { id: string; domain: string; projectId: string; dnsMode: string; dnsConnection: { provider: string } | null; deployment: { deploymentUrl: string | null } | null },
    actionType: RepairType,
  ): Promise<void> {
    const systemUser = 'system';
    switch (actionType) {
      case 'ssl_renewal':
        await this.ssl.renewSsl(systemUser, domain.projectId, domain.id);
        break;

      case 'ssl_reissue':
        await this.ssl.reissueSsl(systemUser, domain.projectId, domain.id);
        break;

      case 'dns_txt_recreated':
      case 'dns_cname_recreated':
      case 'dns_a_recreated':
      case 'dns_aaaa_recreated':
        await this.repairDnsRecord(domain, actionType);
        break;

      case 'mx_recreated':
        await this.repairMxRecord(domain);
        break;

      case 'spf_recreated':
        await this.repairSpfRecord(domain);
        break;

      case 'dmarc_recreated':
        await this.repairDmarcRecord(domain);
        break;

      case 'dkim_recreated':
        // Recreate the DKIM DNS TXT record using the EXISTING key.
        // NEVER regenerate the key during repair — that would break DKIM
        // continuity for existing mail receivers (Outlook, Gmail, etc.)
        // that cache the selector→public key mapping.
        // Key rotation must be explicitly triggered via the DKIM rotate endpoint.
        await this.repairDkimRecord(domain);
        break;

      default:
        throw new Error(`Unknown repair action: ${actionType}`);
    }
  }

  // ── DNS repairs ─────────────────────────────────────────────────────────────

  private async repairDnsRecord(
    domain: { id: string; domain: string; dnsMode: string; dnsConnection: { provider: string } | null; deployment: { deploymentUrl: string | null } | null },
    actionType: RepairType,
  ) {
    if (domain.dnsMode !== 'cloudflare_auto' || !domain.dnsConnection) {
      throw new Error('Auto-DNS not configured for this domain — cannot auto-repair');
    }

    const zoneId = await this.dnsProvider.getZoneId(domain.domain);
    if (!zoneId) throw new Error(`No zone found for ${domain.domain}`);

    const recordType = actionType.replace('dns_', '').replace('_recreated', '').toUpperCase();
    const recordName = actionType === 'dns_txt_recreated' ? `_fidscript-verification.${domain.domain}` : domain.domain;
    const recordContent = this.getRecordContent(domain, recordType as 'A' | 'AAAA' | 'CNAME' | 'TXT');

    // Check if record already exists
    const existing = await this.dnsProvider.listRecords({ zoneId, name: domain.domain, type: recordType as any });
    if (existing.length > 0) {
      this.logger.log(`[repair] ${recordType} record already exists for ${domain.domain}, skipping recreation`);
      return;
    }

    await this.dnsProvider.createRecord({
      zoneId,
      type: recordType as any,
      name: recordName,
      content: recordContent,
      ttl: 300,
      proxied: recordType === 'A' || recordType === 'AAAA',
    });

    this.logger.log(`[repair] Created ${recordType} record for ${domain.domain}`);
  }

  private getRecordContent(
    domain: { domain: string; deployment: { deploymentUrl: string | null } | null },
    type: 'A' | 'AAAA' | 'CNAME' | 'TXT',
  ): string {
    switch (type) {
      case 'A':
        return 'YOUR_SERVER_IP'; // User must update to real IP
      case 'AAAA':
        return 'YOUR_IPV6';
      case 'CNAME':
        return domain.deployment?.deploymentUrl ?? `${domain.domain.split('.')[0]}.apps.local`;
      case 'TXT':
        return `FIDScript verified ${domain.domain}`;
    }
  }

  private async repairMxRecord(domain: { id: string; domain: string; dnsMode: string; dnsConnection: { provider: string } | null }) {
    if (domain.dnsMode !== 'cloudflare_auto' || !domain.dnsConnection) {
      throw new Error('Auto-DNS not configured — cannot auto-repair MX');
    }
    const zoneId = await this.dnsProvider.getZoneId(domain.domain);
    if (!zoneId) throw new Error(`No zone for ${domain.domain}`);

    // Delete any stale MX records
    const existing = await this.dnsProvider.listRecords({ zoneId, name: domain.domain, type: 'MX' });
    await Promise.all(existing.map(r => this.dnsProvider.deleteRecord({ zoneId, recordId: r.id })));

    // Create fresh MX records
    await this.dnsProvider.createRecord({ zoneId, type: 'MX', name: domain.domain, content: `mx1.${domain.domain}`, ttl: 300, priority: 10 });
    await this.dnsProvider.createRecord({ zoneId, type: 'MX', name: domain.domain, content: `mx2.${domain.domain}`, ttl: 300, priority: 20 });
    this.logger.log(`[repair] MX records recreated for ${domain.domain}`);
  }

  private async repairSpfRecord(domain: { id: string; domain: string; dnsMode: string; dnsConnection: { provider: string } | null }) {
    if (domain.dnsMode !== 'cloudflare_auto' || !domain.dnsConnection) {
      throw new Error('Auto-DNS not configured — cannot auto-repair SPF');
    }
    const zoneId = await this.dnsProvider.getZoneId(domain.domain);
    if (!zoneId) throw new Error(`No zone for ${domain.domain}`);

    const existing = await this.dnsProvider.listRecords({ zoneId, name: domain.domain, type: 'TXT' });
    await Promise.all(existing.map(r => this.dnsProvider.deleteRecord({ zoneId, recordId: r.id })));

    await this.dnsProvider.createRecord({
      zoneId, type: 'TXT', name: domain.domain,
      content: `v=spf1 mx include:${domain.domain} ~all`, ttl: 300,
    });
    this.logger.log(`[repair] SPF record recreated for ${domain.domain}`);
  }

  private async repairDmarcRecord(domain: { id: string; domain: string; dnsMode: string; dnsConnection: { provider: string } | null }) {
    if (domain.dnsMode !== 'cloudflare_auto' || !domain.dnsConnection) {
      throw new Error('Auto-DNS not configured — cannot auto-repair DMARC');
    }
    const zoneId = await this.dnsProvider.getZoneId(domain.domain);
    if (!zoneId) throw new Error(`No zone for ${domain.domain}`);

    const existing = await this.dnsProvider.listRecords({ zoneId, name: `_dmarc.${domain.domain}`, type: 'TXT' });
    await Promise.all(existing.map(r => this.dnsProvider.deleteRecord({ zoneId, recordId: r.id })));

    await this.dnsProvider.createRecord({
      zoneId, type: 'TXT', name: `_dmarc.${domain.domain}`,
      content: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain.domain}`, ttl: 300,
    });
    this.logger.log(`[repair] DMARC record recreated for ${domain.domain}`);
  }

  /**
   * Recreate the DKIM DNS TXT record using the EXISTING key.
   * This does NOT regenerate the key — it only recreates the DNS record
   * if it's missing or corrupted. Key regeneration requires explicit
   * rotation via the DKIM rotate endpoint (preserves receiver continuity).
   */
  private async repairDkimRecord(domain: { id: string; domain: string; dnsMode: string; dnsConnection: { provider: string } | null }) {
    if (domain.dnsMode !== 'cloudflare_auto' || !domain.dnsConnection) {
      throw new Error('Auto-DNS not configured — cannot auto-repair DKIM');
    }

    // Get the DNS record info from the existing key (NO regeneration)
    const dkimDns = await this.emailKeyService.getDnsRecord(domain.id, 'default', domain.domain);
    if (!dkimDns) {
      throw new Error(
        'No DKIM key found for this domain. Use the DKIM rotate endpoint to generate a new key — ' +
        'auto-repair cannot create keys (would break DKIM continuity for existing mail receivers).',
      );
    }

    const zoneId = await this.dnsProvider.getZoneId(domain.domain);
    if (!zoneId) throw new Error(`No zone for ${domain.domain}`);

    // Delete any stale DKIM TXT records
    const existing = await this.dnsProvider.listRecords({ zoneId, name: dkimDns.name, type: 'TXT' });
    await Promise.all(existing.map(r => this.dnsProvider.deleteRecord({ zoneId, recordId: r.id })));

    // Recreate using the existing public key
    await this.dnsProvider.createRecord({
      zoneId,
      type: 'TXT',
      name: dkimDns.name,
      content: dkimDns.content,
      ttl: 3600,
    });
    this.logger.log(`[repair] DKIM record recreated for ${domain.domain} (using existing key)`);
  }

  // ── Event helper ──────────────────────────────────────────────────────────

  private async emit(domainId: string, projectId: string, type: string, payload: Record<string, unknown>) {
    this.eventService.emit(type as any, projectId, { domainId, ...payload }, {
      actorType: 'system',
      resourceType: 'domain',
      resourceId: domainId,
    });
  }
}
