import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PlatformEvent {
  type: string;
  payload: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class EventService implements OnModuleDestroy {
  private readonly logger = new Logger(EventService.name);
  private nc: any = null;
  private jetstream: any = null;

  constructor(private configService: ConfigService) {
    this.initNats();
  }

  private async initNats() {
    const natsUrl = this.configService.get<string>('NATS_URL');
    if (!natsUrl) {
      this.logger.warn('NATS_URL not configured, events will be logged only');
      return;
    }

    try {
      const { connect } = await import('nats.ws');
      this.nc = await connect({ servers: [natsUrl] });
      this.jetstream = this.nc.jetstream();
      this.logger.log('Connected to NATS for event streaming');
    } catch (error) {
      this.logger.warn('Failed to connect to NATS, events will be logged only');
    }
  }

  async emit(type: string, payload: Record<string, any>): Promise<void> {
    const event: PlatformEvent = {
      type,
      payload,
      timestamp: new Date(),
    };

    if (this.jetstream) {
      try {
        const subject = `events.${type}`;
        this.jetstream.publish(subject, JSON.stringify(event));
      } catch (error) {
        this.logger.error(`Failed to publish event ${type}:`, error);
      }
    }

    this.logger.debug(`Event emitted: ${type}`, payload);
  }

  async onModuleDestroy() {
    if (this.nc) {
      await this.nc.close();
    }
  }
}
