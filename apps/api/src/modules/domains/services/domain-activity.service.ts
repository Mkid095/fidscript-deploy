import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface ActivityEntry {
  id: string;
  type: string;
  timestamp: string;
  actorId: string | null;
  actorType: string | null;
  resourceType: string;
  resourceId: string;
  projectId: string | null;
  metadata: Record<string, unknown>;
  // Human-readable summary derived from type + metadata
  summary: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

/**
 * Human-readable descriptions for domain event types.
 * Maps the event type to a template that describes what happened.
 * The {domain} placeholder is filled from metadata.
 */
const EVENT_DESCRIPTIONS: Record<string, { summary: string; severity: ActivityEntry['severity'] }> = {
  'domains.verified':           { summary: '✓ Domain verified — DNS and routing confirmed', severity: 'success' },
  'domains.health_changed':    { summary: 'Health status changed for {domain}', severity: 'warning' },
  'domains.recovered':         { summary: '✓ Domain recovered — all checks passing', severity: 'success' },
  'domains.incident.opened':   { summary: '⚠ Incident opened for {domain}', severity: 'critical' },
  'domains.incident.resolved': { summary: '✓ Incident resolved for {domain}', severity: 'success' },
  'domains.dns.changed':       { summary: 'DNS records changed for {domain}', severity: 'info' },
  'domains.verification.started': { summary: 'Verification started for {domain}', severity: 'info' },
  'domains.repair.started':    { summary: '🔧 Auto-repair started for {domain}', severity: 'info' },
  'domains.repair.completed':  { summary: '✓ Auto-repair completed for {domain}', severity: 'success' },
  'domains.repair.failed':     { summary: '✗ Auto-repair failed for {domain}', severity: 'critical' },
  'domains.repair.requires_approval': { summary: '⚠ Repair requires approval for {domain}', severity: 'warning' },
  'domains.ssl_renewing':      { summary: '🔄 SSL certificate renewing for {domain}', severity: 'info' },
  'domains.ssl_issued':        { summary: '✓ SSL certificate issued for {domain}', severity: 'success' },
  'domains.ssl_reissued':      { summary: '✓ SSL certificate reissued for {domain}', severity: 'success' },
  'domains.ssl.expiring':      { summary: '⚠ SSL certificate expires in {days} days for {domain}', severity: 'warning' },
  'domains.email.dns_configured': { summary: '✓ Email DNS configured for {domain}', severity: 'success' },
  'domains.zone.imported':     { summary: 'DNS zone imported for {domain}', severity: 'info' },
  'domains.zone.synced':       { summary: 'DNS zone synced for {domain}', severity: 'info' },
};

function formatSummary(type: string, metadata: Record<string, unknown>): { summary: string; severity: ActivityEntry['severity'] } {
  const desc = EVENT_DESCRIPTIONS[type];
  if (!desc) {
    return {
      summary: type.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' '),
      severity: 'info',
    };
  }
  // Replace placeholders
  let summary = desc.summary;
  const domain = (metadata.domain as string) ?? (metadata.domainId as string) ?? '';
  const days = (metadata.daysRemaining as string | number) ?? (metadata.days as string | number) ?? '';
  summary = summary.replace('{domain}', domain).replace('{days}', String(days));
  return { summary, severity: desc.severity };
}

/**
 * DomainActivityService
 *
 * Provides a domain-scoped activity feed by querying PlatformEvent records
 * filtered to domain-related event types.
 *
 * This is the read-side of the event system — events are emitted by various
 * domain services (health, repair, SSL, verification) and this service
 * surfaces them in a human-readable timeline.
 */
@Injectable()
export class DomainActivityService {
  private readonly logger = new Logger(DomainActivityService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get the activity feed for a specific domain.
   * Returns domain-related events in reverse chronological order.
   */
  async getDomainActivity(
    domainId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ entries: ActivityEntry[]; total: number }> {
    const limit = Math.min(options.limit ?? 50, 200);
    const offset = options.offset ?? 0;

    const where = {
      resourceType: 'domain',
      resourceId: domainId,
    };

    const [events, total] = await Promise.all([
      (this.prisma as any).platformEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      (this.prisma as any).platformEvent.count({ where }),
    ]);

    const entries: ActivityEntry[] = (events as any[]).map(e => {
      const { summary, severity } = formatSummary(e.type, e.metadata ?? {});
      return {
        id: e.id,
        type: e.type,
        timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
        actorId: e.actorId,
        actorType: e.actorType,
        resourceType: e.resourceType,
        resourceId: e.resourceId,
        projectId: e.projectId ?? null,
        metadata: e.metadata ?? {},
        summary,
        severity,
      };
    });

    return { entries, total };
  }

  /**
   * Get the activity feed for ALL domains in a project.
   * Returns events for all domains belonging to the project.
   */
  async getProjectDomainActivity(
    projectId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ entries: ActivityEntry[]; total: number }> {
    const limit = Math.min(options.limit ?? 50, 200);
    const offset = options.offset ?? 0;

    // Query by projectId on PlatformEvent (added in schema migration)
    const where = {
      projectId,
      resourceType: 'domain',
    };

    const [events, total] = await Promise.all([
      (this.prisma as any).platformEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }).catch(() => []),
      (this.prisma as any).platformEvent.count({ where }).catch(() => 0),
    ]);

    const entries: ActivityEntry[] = (events as any[]).map(e => {
      const { summary, severity } = formatSummary(e.type, e.metadata ?? {});
      return {
        id: e.id,
        type: e.type,
        timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
        actorId: e.actorId,
        actorType: e.actorType,
        resourceType: e.resourceType,
        resourceId: e.resourceId,
        projectId: e.projectId ?? projectId,
        metadata: e.metadata ?? {},
        summary,
        severity,
      };
    });

    return { entries, total };
  }
}
