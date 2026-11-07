import { Module, Global, OnModuleInit } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventService } from './event.service';
import { EventNatsConsumerService } from './event-nats-consumer.service';
import { AuditEventConsumer } from './audit-event.consumer';
import { RegistryService } from '../registry/registry.service';

@Global()
@Module({
  // wildcard:true is REQUIRED for @OnEvent('**') (and any pattern listener)
  // to match. Without it, every wildcard consumer silently never fires — which
  // is exactly what was happening (AuditEventConsumer wrote 0 rows; the Phase 13
  // realtime bridge received nothing). Must mirror EventService's own emitter
  // config. Default delimiter '.' matches our dotted event names.
  imports: [EventEmitterModule.forRoot({ wildcard: true })],
  providers: [
    EventService,
    EventNatsConsumerService,
    AuditEventConsumer,
  ],
  exports: [EventService],
})
export class EventsModule implements OnModuleInit {
  constructor(private registry: RegistryService) {}

  onModuleInit() {
    this.registry.register({
      name: 'events',
      version: '1.0.0',
      description: 'Event bus — dual-path (local + NATS JetStream) pub/sub',
      status: 'healthy',
      eventsEmitted: [
        'user.created', 'user.updated', 'user.deleted',
        'session.created', 'session.revoked',
        'api_key.created', 'api_key.revoked',
        'project.created', 'project.updated', 'project.deleted',
        'deployment.started', 'deployment.succeeded', 'deployment.failed',
        'domain.created', 'domain.updated', 'domain.deleted',
        'database.created', 'database.deleted',
        'function.created', 'function.deployed', 'function.invoked', 'function.failed',
        'queue.created', 'queue.message_published',
        'cron.created', 'cron.executed', 'cron.failed',
        'storage.created', 'storage.uploaded', 'storage.deleted',
        'deployments.deployment.created', 'deployments.deployment.queued',
        'deployments.deployment.building', 'deployments.deployment.deploying',
        'deployments.deployment.succeeded', 'deployments.deployment.failed',
        'deployments.deployment.stopped', 'deployments.deployment.rolled_back',
      ],
    });
  }
}
