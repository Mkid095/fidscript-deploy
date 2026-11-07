import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DomainRepairPlannerService } from './domain-repair-planner.service';
import { DomainRepairExecutorService } from './domain-repair-executor.service';
import { DomainRepairQueueService } from './domain-repair-queue.service';
import { UpdateRepairPolicyDto, TriggerRepairDto } from '../dto/domain-repair.dto';

@Injectable()
export class DomainRepairService {
  private readonly logger = new Logger(DomainRepairService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private planner: DomainRepairPlannerService,
    private executor: DomainRepairExecutorService,
    private queue: DomainRepairQueueService,
  ) {}

  // ── Policy ────────────────────────────────────────────────────────────────

  async getPolicy(domainId: string) {
    let policy = await this.prisma.domainRepairPolicy.findUnique({ where: { domainId } });
    if (!policy) {
      // Return defaults if no policy has been explicitly set
      return {
        domainId,
        autoRepairDns: false,
        autoRepairSsl: true,
        autoRepairEmail: false,
        autoRepairRouting: false,
        allowedRepairs: [],
      };
    }
    return policy;
  }

  async updatePolicy(domainId: string, dto: UpdateRepairPolicyDto) {
    const domain = await this.prisma.domain.findUnique({ where: { id: domainId } });
    if (!domain) throw new NotFoundException('Domain not found');

    const policy = await this.prisma.domainRepairPolicy.upsert({
      where: { domainId },
      create: {
        domainId,
        autoRepairDns: dto.autoRepairDns ?? false,
        autoRepairSsl: dto.autoRepairSsl ?? true,
        autoRepairEmail: dto.autoRepairEmail ?? false,
        autoRepairRouting: dto.autoRepairRouting ?? false,
        allowedRepairs: dto.allowedRepairs ?? [],
      },
      update: {
        autoRepairDns: dto.autoRepairDns ?? undefined,
        autoRepairSsl: dto.autoRepairSsl ?? undefined,
        autoRepairEmail: dto.autoRepairEmail ?? undefined,
        autoRepairRouting: dto.autoRepairRouting ?? undefined,
        allowedRepairs: dto.allowedRepairs ?? undefined,
      },
    });

    await this.emit(domainId, domain.projectId, 'domains.repair.policy_updated', { policy });
    return policy;
  }

  // ── Repair runs ────────────────────────────────────────────────────────────

  async listRepairs(domainId: string, limit = 20) {
    return this.prisma.domainRepairRun.findMany({
      where: { domainId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  async getRepairPlan(domainId: string, incidentId?: string) {
    if (incidentId) {
      return this.planner.planForIncident(incidentId);
    }
    return this.planner.planForDomain(domainId, 'manual');
  }

  /**
   * Trigger a repair — either for an incident (via queue) or directly.
   * If autoApprove=true, executes immediately. Otherwise queues for approval.
   */
  async triggerRepair(domainId: string, dto: TriggerRepairDto) {
    const domain = await this.prisma.domain.findUnique({ where: { id: domainId } });
    if (!domain) throw new NotFoundException('Domain not found');

    // Build repair plan
    const plan = dto.incidentId
      ? await this.planner.planForIncident(dto.incidentId)
      : dto.repairType
      ? await this.planner.planForDomain(domainId, dto.repairType)
      : null;

    if (!plan || plan.actions.length === 0) {
      return { queued: false, message: 'No repair actions available for this domain' };
    }

    // Level 2: auto-approve if policy allows
    if (dto.autoApprove || plan.canAutoRepair) {
      // Execute immediately (inline, not via queue)
      const result = await this.executor.executeRepair(domainId, plan, dto.incidentId);
      return { queued: false, ...result };
    }

    // Level 1: queue for approval
    await this.queue.enqueue(domainId, dto.incidentId ?? null, plan.actions[0].type, 'manual');
    await this.emit(domainId, domain.projectId, 'domains.repair.requires_approval', {
      domain: domain.domain,
      incidentId: dto.incidentId,
      actions: plan.actions.map(a => a.type),
      canAutoRepair: plan.canAutoRepair,
    });

    return {
      queued: true,
      message: 'Repair queued — approval required based on current policy',
      actions: plan.actions.map(a => ({ type: a.type, description: a.description, confidence: a.confidence })),
    };
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
