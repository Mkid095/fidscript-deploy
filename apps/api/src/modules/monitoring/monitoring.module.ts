import { Module } from '@nestjs/common';
import { MetricsController } from './controllers/metrics.controller';
import { AlertsController } from './controllers/alerts.controller';
import { NotificationChannelsController } from './controllers/notification-channels.controller';
import { PrometheusController } from './controllers/prometheus.controller';
import { MetricsService } from './services/metrics.service';
import { AlertRuleService } from './services/alert-rule.service';
import { AlertService } from './services/alert.service';
import { NotificationChannelService } from './services/notification-channel.service';
import { AlertEvaluatorService } from './services/alert-evaluator.service';
import { NotificationService } from './services/notification.service';
import { PrometheusService } from './services/prometheus.service';
import { EmailNotifier } from './notifiers/email.notifier';
import { WebhookNotifier } from './notifiers/webhook.notifier';
import { SlackNotifier } from './notifiers/slack.notifier';
import { EmailModule } from '@/modules/email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [
    MetricsController,
    AlertsController,
    NotificationChannelsController,
    PrometheusController,
  ],
  providers: [
    MetricsService,
    AlertRuleService,
    AlertService,
    NotificationChannelService,
    AlertEvaluatorService,
    NotificationService,
    PrometheusService,
    EmailNotifier,
    WebhookNotifier,
    SlackNotifier,
  ],
  exports: [
    MetricsService,
    AlertRuleService,
    AlertService,
    NotificationChannelService,
  ],
})
export class MonitoringModule {}
