import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventService } from '../events/event.service';

export interface ServiceRegistration {
  name: string;
  version: string;
  description: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  eventsEmitted: string[];
  registeredAt: Date;
}

@Injectable()
export class RegistryService implements OnModuleInit {
  private readonly logger = new Logger(RegistryService.name);
  private readonly services = new Map<string, ServiceRegistration>();

  constructor(private eventService: EventService) {}

  onModuleInit() {
    // Modules auto-register via their own onModuleInit.
    // This is called once after all modules init — log the registry state.
    this.logger.log(`Service registry initialized with ${this.services.size} services`);
  }

  register(info: Omit<ServiceRegistration, 'registeredAt'>): void {
    const reg: ServiceRegistration = {
      ...info,
      registeredAt: new Date(),
    };
    this.services.set(info.name, reg);
    this.logger.debug(`Service registered: ${info.name} v${info.version}`);
  }

  getServices(): ServiceRegistration[] {
    return Array.from(this.services.values());
  }

  getService(name: string): ServiceRegistration | undefined {
    return this.services.get(name);
  }

  updateStatus(name: string, status: ServiceRegistration['status']): void {
    const existing = this.services.get(name);
    if (existing) {
      existing.status = status;
    }
  }

  getEventService(): EventService {
    return this.eventService;
  }
}