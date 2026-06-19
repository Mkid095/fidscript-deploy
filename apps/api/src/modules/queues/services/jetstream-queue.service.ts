import { Injectable, Logger } from '@nestjs/common';
import { JetStreamClient, NatsConnection, JetStreamManager } from 'nats';

const QUEUES_STREAM = 'QUEUES';

@Injectable()
export class JetStreamQueueService {
  private readonly logger = new Logger(JetStreamQueueService.name);
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;

  async connect(nc: NatsConnection): Promise<void> {
    this.js = nc.jetstream();
    this.jsm = await nc.jetstreamManager();
    try {
      await this.jsm.streams.add({
        name: QUEUES_STREAM,
        subjects: ['queues.>'],
        max_bytes: 10 * 1024 * 1024 * 1024,
        max_age: 7 * 24 * 60 * 60 * 1_000_000_000,
        storage: 'file' as any,
      });
      this.logger.log('QUEUES stream created/verified');
    } catch (err: unknown) {
      if (!(err as Error).message?.includes('already exists')) {
        this.logger.warn(`QUEUES stream setup: ${(err as Error).message}`);
      }
    }
  }

  subjectFor(projectId: string, queueName: string): string {
    return `queues.${projectId}.${queueName}`;
  }

  async publish(
    projectId: string,
    queueName: string,
    body: string,
    headers: Record<string, string> = {},
    delaySeconds?: number,
  ): Promise<{ seq: number }> {
    if (!this.js) throw new Error('JetStream not connected');
    const subject = this.subjectFor(projectId, queueName);
    const hdrs: Record<string, string> = {
      'x-project-id': projectId,
      'x-queue-name': queueName,
      ...headers,
    };
    const opts: Record<string, unknown> = { headers: hdrs };
    if (delaySeconds && delaySeconds > 0) {
      opts['headers'] = {
        ...hdrs,
        'Nats-Delay': String(Math.floor(delaySeconds * 1_000_000_000)),
      };
    }
    const pa = await this.js.publish(subject, body, opts);
    return { seq: pa.seq };
  }

  async ensureConsumer(
    projectId: string,
    queueName: string,
    ackWaitSeconds = 60,
    maxDeliver = 3,
  ): Promise<string> {
    if (!this.jsm) throw new Error('JetStream manager not connected');
    const durableName = `q-${queueName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48)}`;
    const filterSubject = this.subjectFor(projectId, queueName);
    try {
      await this.jsm.consumers.add(QUEUES_STREAM, {
        durable_name: durableName,
        filter_subject: filterSubject,
        ack_policy: 'explicit' as any,
        ack_wait: ackWaitSeconds * 1_000_000_000,
        max_deliver: maxDeliver,
        max_ack_pending: 10,
        deliver_policy: 'all' as any,
      });
      this.logger.debug(`Consumer "${durableName}" created for ${filterSubject}`);
    } catch (err: unknown) {
      if (!(err as Error).message?.includes('already exists')) throw err;
      try {
        await this.jsm.consumers.update(QUEUES_STREAM, durableName, {
          ack_wait: ackWaitSeconds * 1_000_000_000,
          max_deliver: maxDeliver,
          max_ack_pending: 10,
        });
      } catch { /* ignore update errors on existing */ }
    }
    return durableName;
  }

  async getConsumer(stream: string, durableName: string) {
    if (!this.js) return null;
    try {
      return await this.js.consumers.get(stream, durableName);
    } catch {
      return null;
    }
  }

  async deleteConsumer(queueName: string): Promise<void> {
    if (!this.jsm) return;
    const durableName = `q-${queueName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48)}`;
    try {
      await this.jsm.consumers.delete(QUEUES_STREAM, durableName);
    } catch { /* ignore if already gone */ }
  }

  async getStreamStats(projectId: string, queueName: string): Promise<{ messages: number; bytes: number }> {
    if (!this.jsm) return { messages: 0, bytes: 0 };
    try {
      const info = await this.jsm.streams.info(QUEUES_STREAM);
      return {
        messages: Number(info.state.messages) || 0,
        bytes: Number(info.state.bytes) || 0,
      };
    } catch {
      return { messages: 0, bytes: 0 };
    }
  }

  get STREAM_NAME(): string {
    return QUEUES_STREAM;
  }
}
