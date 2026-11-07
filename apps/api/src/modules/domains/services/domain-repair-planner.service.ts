import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export type RepairType =
  | 'ssl_renewal'
  | 'ssl_reissue'
  | 'dns_txt_recreated'
  | 'dns_cname_recreated'
  | 'dns_a_recreated'
  | 'dns_aaaa_recreated'
  | 'mx_recreated'
  | 'spf_recreated'
  | 'dmarc_recreated'
  | 'dkim_recreated'
  | 'routing_reconfigured';

export interface RepairAction {
  type: RepairType;
  description: string;
  confidence: number; // 0-100
  autoApplicable: boolean; // whether this can run automatically
  requiresApproval: boolean;
}

export interface RepairPlan {
  domainId: string;
  incidentId: string | null;
  incidentType: string;
  actions: RepairAction[];
  canAutoRepair: boolean;
  autoRepairReason: string | null;
}

/**
 * DomainRepairPlannerService
 *
 * Analyzes an incident (or domain state) and produces a repair plan:
 * - Which repair actions are needed
 * - Confidence score per action
 * - Whether auto-repair is allowed per domain policy
 */
@Injectable()
export class DomainRepairPlannerService {
  private readonly logger = new Logger(DomainRepairPlannerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Produce a repair plan for a domain incident.
   */
  async planForIncident(incidentId: string): Promise<RepairPlan | null> {
    const incident = await this.prisma.domainIncident.findUnique({
      where: { id: incidentId },
      include: { domain: true },
    });
    if (!incident) return null;

    return this.buildPlan(incident.domainId, incident.type, incident.id, null);
  }

  /**
   * Produce a repair plan for a domain based on its current health state.
   * Used for proactive repairs triggered by the reconciliation engine.
   */
  async planForDomain(domainId: string, reason: string): Promise<RepairPlan> {
    return this.buildPlan(domainId, reason, null, null);
  }

  private async buildPlan(
    domainId: string,
    incidentType: string,
    incidentId: string | null,
    _override: unknown,
  ): Promise<RepairPlan> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      include: { dnsConnection: true },
    });
    if (!domain) throw new Error(`Domain ${domainId} not found`);

    const policy = await this.prisma.domainRepairPolicy.findUnique({
      where: { domainId },
    });

    const actions = this.getActionsForType(incidentType, domain, policy);
    const canAutoRepair = this.canAutoRepair(actions, policy);

    return {
      domainId,
      incidentId,
      incidentType,
      actions,
      canAutoRepair,
      autoRepairReason: canAutoRepair ? null : 'Policy does not allow auto-repair for this incident type',
    };
  }

  private getActionsForType(
    type: string,
    domain: { id: string; domain: string; dnsMode: string; dnsConnection: { provider: string } | null },
    policy: { autoRepairSsl?: boolean; autoRepairDns?: boolean; autoRepairEmail?: boolean } | null,
  ): RepairAction[] {
    const actions: RepairAction[] = [];

    switch (type) {
      case 'ssl_expired':
      case 'certificate_issuance_failed':
        actions.push({
          type: 'ssl_renewal',
          description: 'Renew SSL certificate via Let\'s Encrypt',
          confidence: 95,
          autoApplicable: (policy?.autoRepairSsl ?? true) === true,
          requiresApproval: (policy?.autoRepairSsl ?? true) === false,
        });
        break;

      case 'dns_missing':
      case 'routing_failure':
        // Check if domain uses Cloudflare auto-DNS
        if (domain.dnsMode === 'cloudflare_auto' && domain.dnsConnection) {
          actions.push({
            type: 'dns_txt_recreated',
            description: `Recreate _fidscript-verification TXT record via ${domain.dnsConnection.provider}`,
            confidence: 90,
            autoApplicable: (policy?.autoRepairDns ?? false) === true,
            requiresApproval: (policy?.autoRepairDns ?? false) === false,
          });
          actions.push({
            type: 'dns_cname_recreated',
            description: `Recreate CNAME record via ${domain.dnsConnection.provider}`,
            confidence: 85,
            autoApplicable: (policy?.autoRepairDns ?? false) === true,
            requiresApproval: (policy?.autoRepairDns ?? false) === false,
          });
        } else {
          actions.push({
            type: 'dns_txt_recreated',
            description: 'DNS record missing — manual intervention required (no auto-DNS configured)',
            confidence: 100,
            autoApplicable: false,
            requiresApproval: false,
          });
        }
        break;

      case 'mx_invalid':
        actions.push({
          type: 'mx_recreated',
          description: 'Recreate MX records for inbound email',
          confidence: 88,
          autoApplicable: (policy?.autoRepairEmail ?? false) === true,
          requiresApproval: (policy?.autoRepairEmail ?? false) === false,
        });
        break;

      case 'spf_missing':
      case 'spf_invalid':
        actions.push({
          type: 'spf_recreated',
          description: 'Recreate SPF TXT record',
          confidence: 92,
          autoApplicable: (policy?.autoRepairEmail ?? false) === true,
          requiresApproval: (policy?.autoRepairEmail ?? false) === false,
        });
        break;

      case 'dmarc_invalid':
        actions.push({
          type: 'dmarc_recreated',
          description: 'Recreate DMARC TXT record',
          confidence: 90,
          autoApplicable: (policy?.autoRepairEmail ?? false) === true,
          requiresApproval: (policy?.autoRepairEmail ?? false) === false,
        });
        break;

      case 'dkim_invalid':
        actions.push({
          type: 'dkim_recreated',
          description: 'Recreate DKIM TXT record',
          confidence: 85,
          autoApplicable: (policy?.autoRepairEmail ?? false) === true,
          requiresApproval: (policy?.autoRepairEmail ?? false) === false,
        });
        break;

      default:
        this.logger.warn(`[repair-planner] Unknown incident type: ${type}`);
    }

    return actions;
  }

  private canAutoRepair(actions: RepairAction[], policy: { allowedRepairs?: unknown } | null): boolean {
    if (!policy) return false;
    if (actions.length === 0) return false;
    const allowed: string[] = (policy.allowedRepairs as string[]) ?? [];
    return actions.every(a => a.autoApplicable && (allowed.length === 0 || allowed.includes(a.type)));
  }
}
