import { Module } from '@nestjs/common';
import { LoggingController } from './controllers/logging.controller';
import { LogStreamService } from './services/log-stream.service';
import { LogWriteService } from './services/log-write.service';
import { LogQueryService } from './services/log-query.service';
import { LogRetentionService } from './services/log-retention.service';
import { LogQuotaService } from './services/log-quota.service';
import { LogSchedulerService } from './services/log-scheduler.service';
import { LogShipperService } from './services/log-shipper.service';
import { WebhookShipper } from './services/shippers/webhook.shipper';
import { MinioShipper } from './services/shippers/minio.shipper';
import { LogIngestController } from './controllers/log-ingest.controller';
import { StorageModule } from '@/modules/storage/storage.module';
import { MonitoringModule } from '@/modules/monitoring/monitoring.module';
import { ProjectsModule } from '@/modules/projects/projects.module';

@Module({
  imports: [StorageModule, MonitoringModule, ProjectsModule],
  controllers: [LoggingController, LogIngestController],
  providers: [
    LogStreamService,
    LogWriteService,
    LogQueryService,
    LogRetentionService,
    LogQuotaService,
    LogSchedulerService,
    LogShipperService,
    WebhookShipper,
    MinioShipper,
  ],
  exports: [
    LogStreamService,
    LogWriteService,
    LogQueryService,
    LogRetentionService,
    LogQuotaService,
    LogShipperService,
  ],
})
export class LoggingModule {}
