import { Module } from '@nestjs/common';
import { MonitoringController } from './controllers/monitoring.controller';
import { MetricsService } from './services/metrics.service';
import { AlertRuleService } from './services/alert-rule.service';
import { AlertService } from './services/alert.service';
import { NotificationChannelService } from './services/notification-channel.service';

@Module({
  controllers: [MonitoringController],
  providers: [
    MetricsService,
    AlertRuleService,
    AlertService,
    NotificationChannelService,
  ],
  exports: [
    MetricsService,
    AlertRuleService,
    AlertService,
    NotificationChannelService,
  ],
})
export class MonitoringModule {}
