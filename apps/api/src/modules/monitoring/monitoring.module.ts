import { Module } from '@nestjs/common';
import { MetricsController } from './controllers/metrics.controller';
import { AlertsController } from './controllers/alerts.controller';
import { NotificationChannelsController } from './controllers/notification-channels.controller';
import { MetricsService } from './services/metrics.service';
import { AlertRuleService } from './services/alert-rule.service';
import { AlertService } from './services/alert.service';
import { NotificationChannelService } from './services/notification-channel.service';

@Module({
  controllers: [
    MetricsController,
    AlertsController,
    NotificationChannelsController,
  ],
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
