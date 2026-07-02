import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NatsConnection, JetStreamClient, JetStreamManager, AckPolicy } from 'nats';
import { EventService } from '@/modules/events/event.service';

const DOMAIN_REPAIR_STREAM = 'DOMAIN_REPAIR';
const DOMAIN_REPAIR_SUBJECT = 'domain.repair';
const DOMAIN_REPAIR_DURABLE = 'domain-repair-worker';

export type RepairJobReason = 'incident' | 'manual' | 'auto';

export interface RepairJob {
  domainId: string;
  incidentId: string | null;
  repairType: string;
  reason: RepairJobReason;
  enqueuedAt: string;
  attempt?: number;
}

@Injectable()
export class DomainRepairQueueService implements OnModuleInit {
  private readonly logger = new Logger(DomainRepairQueueService.name);
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;

  constructor(private readonly eventService: EventService) {}

  async onModuleInit() {
    await new Promise<void>(resolve => setTimeout(resolve, 2000));
    this.nc = this.eventService.getNatsConnection();
    if (!this.nc) {
      this.logger.warn('NATS not connected — domain repair queue will not function');
      return;
    }
    this.js = this.nc.jetstream();
    this.jsm = await this.nc.jetstreamManager();
    await this.ensureStream();
    this.logger.log('DomainRepairQueueService connected to NATS');
  }

  private async ensureStream() {
    if (!this.jsm) return;
    try {
      await this.jsm.streams.add({
        name: DOMAIN_REPAIR_STREAM,
        subjects: [`${DOMAIN_REPAIR_SUBJECT}.>`],
        max_bytes: 1 * 1024 * 1024 * 1024,
        max_age: 7 * 24 * 60 * 60 * 1_000_000_000,
        storage: 'file' as any,
      });
    } catch (err: unknown) {
      if (!(err as Error).message?.includes('already exists')) {
        this.logger.warn(`DOMAIN_REPAIR stream: ${(err as Error).message}`);
      }
    }

    try {
      await this.jsm.consumers.add(DOMAIN_REPAIR_STREAM, {
        name: DOMAIN_REPAIR_DURABLE,
        durable_name: DOMAIN_REPAIR_DURABLE,
        ack_policy: AckPolicy.Explicit,
        ack_wait: 180,
        max_deliver: 3,
        max_ack_pending: 5,
        filter_subject: DOMAIN_REPAIR_SUBJECT,
      });
    } catch (err: unknown) {
      if (!(err as Error).message?.includes('already exists')) {
        this.logger.warn(`DOMAIN_REPAIR consumer: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Enqueue a repair job.
   */
  async enqueue(
    domainId: string,
    incidentId: string | null,
    repairType: string,
    reason: RepairJobReason = 'manual',
    delaySeconds?: number,
  ): Promise<{ seq: number }> {
    if (!this.js) throw new Error('JetStream not connected');
    const job: RepairJob = { domainId, incidentId, repairType, reason, enqueuedAt: new Date().toISOString(), attempt: 1 };
    const body = JSON.stringify(job);
    const opts: Record<string, unknown> = {
      headers: { 'x-domain-id': domainId, 'x-incident-id': incidentId ?? '', 'x-reason': reason },
    };
    if (delaySeconds && delaySeconds > 0) {
      (opts.headers as Record<string, string>)['Nats-Delay'] = String(Math.floor(delaySeconds * 1_000_000_000));
    }
    const pa = await this.js.publish(`${DOMAIN_REPAIR_SUBJECT}.${domainId}`, body, opts);
    this.logger.debug(`[repair-queue] enqueued domainId=${domainId} incidentId=${incidentId} seq=${pa.seq}`);
    return { seq: pa.seq };
  }

  async getConsumer() {
    if (!this.js) return null;
    try {
      return await this.js.consumers.get(DOMAIN_REPAIR_STREAM, DOMAIN_REPAIR_DURABLE);
    } catch { return null; }
  }

  getStreamName() { return DOMAIN_REPAIR_STREAM; }
  getDurableName() { return DOMAIN_REPAIR_DURABLE; }
}
