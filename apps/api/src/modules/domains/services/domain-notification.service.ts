import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { ProjectMemberService } from '@/modules/projects/services/project-member.service';

export interface NotificationPreference {
  userId: string;
  projectId: string;
  eventTypes: string[];
  severity: ('info' | 'warning' | 'critical')[];
}

/**
 * Severity mapping for domain event types.
 * Determines which events are "notification-worthy" and at what severity.
 */
const EVENT_SEVERITY: Record<string, { severity: 'info' | 'warning' | 'critical'; title: string }> = {
  'domains.incident.opened':        { severity: 'critical', title: 'Domain incident opened' },
  'domains.repair.failed':          { severity: 'critical', title: 'Auto-repair failed' },
  'domains.repair.requires_approval': { severity: 'warning', title: 'Repair requires approval' },
  'domains.ssl.expiring':           { severity: 'warning', title: 'SSL certificate expiring' },
  'domains.health_changed':         { severity: 'warning', title: 'Domain health changed' },
  'domains.verified':               { severity: 'info', title: 'Domain verified' },
  'domains.recovered':              { severity: 'info', title: 'Domain recovered' },
  'domains.repair.completed':       { severity: 'info', title: 'Auto-repair completed' },
  'domains.ssl_issued':             { severity: 'info', title: 'SSL certificate issued' },
  'domains.dns.changed':            { severity: 'info', title: 'DNS records changed' },
  'domains.zone.synced':            { severity: 'info', title: 'DNS zone synced' },
  'domains.email.dns_configured':   { severity: 'info', title: 'Email DNS configured' },
};

/**
 * DomainNotificationService
 *
 * Listens for domain-related PlatformEvents and creates UserNotification
 * records for project members who should be notified.
 *
 * This is the bridge between the event system (EventService.emit → PlatformEvent)
 * and the user-facing notification inbox (UserNotification table).
 *
 * Notification rules:
 *   - Critical events (incident, repair failed) → notify ALL project members
 *   - Warning events (SSL expiring, health degraded) → notify members with admin/owner role
 *   - Info events (verified, repaired) → create notification but don't push (low priority)
 *
 * Each notification is per-user (one row per user per event) so read state is tracked
 * independently per user.
 */
@Injectable()
export class DomainNotificationService {
  private readonly logger = new Logger(DomainNotificationService.name);

  constructor(
    private prisma: PrismaService,
    private memberService: ProjectMemberService,
  ) {}

  /**
   * Listen for domain events and create notifications.
   * Uses NestJS @OnEvent with wildcard to catch all domains.* events.
   */
  @OnEvent('domains.**')
  async onDomainEvent(event: {
    id: string;
    type: string;
    projectId?: string;
    metadata: Record<string, unknown>;
    resourceType?: string;
    resourceId?: string;
    actorId?: string;
  }): Promise<void> {
    const config = EVENT_SEVERITY[event.type];
    if (!config) return; // Not all domain events generate notifications

    const projectId = event.projectId;
    if (!projectId) {
      this.logger.debug(`[notifications] Event ${event.type} has no projectId — skipping`);
      return;
    }

    const domain = (event.metadata?.domain as string) ?? (event.metadata?.domainId as string) ?? 'domain';

    // Build the notification message
    const message = this.formatMessage(event.type, domain, event.metadata);

    try {
      // Get all project members who should be notified
      const members = await this.getNotifiableMembers(projectId, config.severity);
      if (members.length === 0) {
        this.logger.debug(`[notifications] No notifiable members for ${event.type} in project ${projectId}`);
        return;
      }

      // Create a UserNotification for each member
      await Promise.all(
        members.map(userId =>
          (this.prisma as any).userNotification.create({
            data: {
              userId,
              eventId: event.id,
              type: event.type,
              title: config.title,
              message,
              severity: config.severity,
              projectId,
              resourceType: event.resourceType ?? 'domain',
              resourceId: event.resourceId ?? '',
            },
          }).catch(() => {/* ignore individual failures */}),
        ),
      );

      this.logger.log(`[notifications] Created ${members.length} notifications for ${event.type} (${domain})`);
    } catch (err) {
      // Don't break the event chain — notifications are best-effort
      this.logger.error(`[notifications] Failed to create notifications for ${event.type}: ${err instanceof Error ? err.message : err}`);
    }
  }

  /**
   * Get users who should be notified for an event of given severity.
   * Critical → all members; Warning → admins/owners; Info → admins/owners.
   */
  private async getNotifiableMembers(projectId: string, severity: string): Promise<string[]> {
    try {
      // Query project members directly (avoid tight coupling to member service internals)
      const members = await (this.prisma as any).projectMember.findMany({
        where: { projectId, deletedAt: null },
        select: { userId: true, role: true },
      });

      if (severity === 'critical') {
        // Notify everyone for critical events
        return members.map((m: any) => m.userId);
      }

      // For warning/info: only admins and owners
      return members
        .filter((m: any) => m.role === 'OWNER' || m.role === 'ADMIN')
        .map((m: any) => m.userId);
    } catch {
      return [];
    }
  }

  /**
   * Format a human-readable notification message from event metadata.
   */
  private formatMessage(type: string, domain: string, metadata: Record<string, unknown>): string {
    const details = metadata.error ?? metadata.reason ?? '';
    switch (type) {
      case 'domains.incident.opened':
        return `An incident has been opened for ${domain}. ${details ? `Reason: ${details}` : 'Investigation required.'}`;
      case 'domains.repair.failed':
        return `Automatic repair failed for ${domain}. ${details ? `Error: ${details}` : 'Manual intervention may be needed.'}`;
      case 'domains.repair.requires_approval':
        return `A repair for ${domain} requires your approval before it can be applied.`;
      case 'domains.ssl.expiring':
        const days = metadata.daysRemaining ?? metadata.days ?? 7;
        return `The SSL certificate for ${domain} expires in ${days} days. Renewal recommended.`;
      case 'domains.health_changed':
        const newStatus = metadata.newStatus ?? 'unknown';
        return `The health status of ${domain} changed to ${newStatus}.`;
      case 'domains.verified':
        return `${domain} has been verified — DNS and routing are confirmed working.`;
      case 'domains.recovered':
        return `${domain} has recovered. All health checks are now passing.`;
      case 'domains.repair.completed':
        const actions = metadata.actions ?? [];
        return `Auto-repair completed for ${domain}. ${Array.isArray(actions) ? actions.join(', ') : ''}`;
      case 'domains.ssl_issued':
        return `SSL certificate issued for ${domain}. HTTPS is now active.`;
      case 'domains.dns.changed':
        return `DNS records were changed for ${domain}.`;
      case 'domains.zone.synced':
        return `DNS zone for ${domain} was synchronized with the provider.`;
      case 'domains.email.dns_configured':
        return `Email DNS (MX, SPF, DKIM, DMARC) configured for ${domain}.`;
      default:
        return `Event: ${type} for ${domain}`;
    }
  }
}
