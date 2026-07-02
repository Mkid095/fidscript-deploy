import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DomainRepairQueueService, RepairJob } from './domain-repair-queue.service';
import { DomainRepairExecutorService } from './domain-repair-executor.service';
import { DomainRepairPlannerService } from './domain-repair-planner.service';
import { EventService } from '@/modules/events/event.service';

const MAX_DELIVER = 3;
const BASE_RETRY_DELAY = 30;

@Injectable()
export class DomainRepairWorker implements OnModuleInit {
  private readonly logger = new Logger(DomainRepairWorker.name);
  private running = false;

  constructor(
    private readonly queueService: DomainRepairQueueService,
    private readonly executor: DomainRepairExecutorService,
    private readonly planner: DomainRepairPlannerService,
    private readonly eventService: EventService,
  ) {}

  async onModuleInit() {
    await new Promise<void>(resolve => setTimeout(resolve, 3000));
    this.start();
  }

  private async start() {
    if (this.running) return;
    this.running = true;
    this.logger.log('DomainRepairWorker started');
    this.poll();
  }

  private async poll() {
    while (this.running) {
      try {
        await this.processBatch();
      } catch (err) {
        this.logger.error(`[repair-worker] poll error: ${err instanceof Error ? err.message : err}`);
        await new Promise<void>(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async processBatch() {
    const consumer = await this.queueService.getConsumer();
    if (!consumer) {
      await new Promise<void>(resolve => setTimeout(resolve, 5000));
      return;
    }

    const batch = await consumer.fetch({ max_messages: 3, expires: 5000 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const msg of batch as any) {
      let job: RepairJob;
      try {
        job = JSON.parse(msg.data.toString());
      } catch {
        this.logger.error('[repair-worker] could not parse job, discarding');
        await msg.ack();
        continue;
      }

      const attempt = job.attempt ?? 1;

      try {
        this.logger.debug(`[repair-worker] processing domainId=${job.domainId} incidentId=${job.incidentId} attempt=${attempt}`);

        // Build repair plan
        const plan = job.incidentId
          ? await this.planner.planForIncident(job.incidentId)
          : await this.planner.planForDomain(job.domainId, job.repairType);

        if (!plan || plan.actions.length === 0) {
          this.logger.warn(`[repair-worker] no repair plan for domainId=${job.domainId}`);
          await msg.ack();
          continue;
        }

        // Execute repair
        const result = await this.executor.executeRepair(job.domainId, plan, job.incidentId);
        this.logger.log(
          `[repair-worker] done domainId=${job.domainId} status=${result.status} actions=${result.actionsPerformed.join(',')}`,
        );
        await msg.ack();

      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`[repair-worker] failed domainId=${job.domainId} attempt=${attempt}: ${errMsg}`);

        if (attempt < MAX_DELIVER) {
          const delay = BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
          await this.queueService.enqueue(job.domainId, job.incidentId, job.repairType, job.reason as any, delay);
          this.logger.warn(`[repair-worker] re-enqueued domainId=${job.domainId} delay=${delay}s`);
        } else {
          this.logger.error(`[repair-worker] giving up on domainId=${job.domainId} after ${MAX_DELIVER} attempts`);
          // Emit failure event
          this.eventService.emit('domains.repair.failed' as any, job.domainId, {
            domainId: job.domainId,
            incidentId: job.incidentId,
            error: errMsg,
          });
        }
        await msg.ack();
      }
    }
  }

  stop() {
    this.running = false;
  }
}
