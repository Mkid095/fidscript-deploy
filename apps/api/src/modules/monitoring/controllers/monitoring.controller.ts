import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { MetricsService } from '@/modules/monitoring/services/metrics.service';
import { AlertRuleService } from '@/modules/monitoring/services/alert-rule.service';
import { AlertService } from '@/modules/monitoring/services/alert.service';
import { NotificationChannelService } from '@/modules/monitoring/services/notification-channel.service';
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  GetMetricsDto,
  GetAlertsDto,
  CreateNotificationChannelDto,
  UpdateNotificationChannelDto,
} from '@/modules/monitoring/dto/index';

@ApiTags('monitoring')
@Controller('projects/:projectId/monitoring')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MonitoringController {
  constructor(
    private metricsService: MetricsService,
    private alertRuleService: AlertRuleService,
    private alertService: AlertService,
    private notificationChannelService: NotificationChannelService,
  ) {}

  // ===== Metrics =====

  @Get('metrics')
  @ApiOperation({ summary: 'Get metrics' })
  async getMetrics(@Param('projectId') projectId: string, @Query() dto: GetMetricsDto) {
    return this.metricsService.getMetrics(projectId, dto);
  }

  @Get('metrics/:metric/summary')
  @ApiOperation({ summary: 'Get metric summary' })
  async getMetricSummary(
    @Param('projectId') projectId: string,
    @Param('metric') metric: string,
    @Query('interval') interval?: string,
  ) {
    return this.metricsService.getMetricSummary(projectId, metric, interval);
  }

  @Post('metrics')
  @ApiOperation({ summary: 'Record metric' })
  async recordMetric(
    @Param('projectId') projectId: string,
    @Body() body: { metric: string; value: number; labels?: Record<string, string> },
  ) {
    return this.metricsService.recordMetric(projectId, body.metric, body.value, body.labels);
  }

  // ===== Alert Rules =====

  @Post('alerts/rules')
  @ApiOperation({ summary: 'Create alert rule' })
  async createAlertRule(@Param('projectId') projectId: string, @Body() dto: CreateAlertRuleDto) {
    return this.alertRuleService.createAlertRule(projectId, dto);
  }

  @Get('alerts/rules')
  @ApiOperation({ summary: 'List alert rules' })
  async listAlertRules(@Param('projectId') projectId: string) {
    const rules = await this.alertRuleService.listAlertRules(projectId);
    return { rules };
  }

  @Get('alerts/rules/:ruleId')
  @ApiOperation({ summary: 'Get alert rule' })
  async getAlertRule(@Param('projectId') projectId: string, @Param('ruleId') ruleId: string) {
    return this.alertRuleService.getAlertRule(projectId, ruleId);
  }

  @Patch('alerts/rules/:ruleId')
  @ApiOperation({ summary: 'Update alert rule' })
  async updateAlertRule(
    @Param('projectId') projectId: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateAlertRuleDto,
  ) {
    return this.alertRuleService.updateAlertRule(projectId, ruleId, dto);
  }

  @Delete('alerts/rules/:ruleId')
  @ApiOperation({ summary: 'Delete alert rule' })
  async deleteAlertRule(@Param('projectId') projectId: string, @Param('ruleId') ruleId: string) {
    return this.alertRuleService.deleteAlertRule(projectId, ruleId);
  }

  // ===== Alerts =====

  @Get('alerts')
  @ApiOperation({ summary: 'Get alerts' })
  async getAlerts(@Param('projectId') projectId: string, @Query() dto: GetAlertsDto) {
    const alerts = await this.alertService.getAlerts(projectId, dto);
    return { alerts };
  }

  @Get('alerts/:alertId')
  @ApiOperation({ summary: 'Get alert' })
  async getAlert(@Param('projectId') projectId: string, @Param('alertId') alertId: string) {
    return this.alertService.getAlert(projectId, alertId);
  }

  @Post('alerts/:alertId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge alert' })
  async acknowledgeAlert(@Param('projectId') projectId: string, @Param('alertId') alertId: string) {
    return this.alertService.acknowledgeAlert(projectId, alertId);
  }

  @Post('alerts/:alertId/resolve')
  @ApiOperation({ summary: 'Resolve alert' })
  async resolveAlert(@Param('projectId') projectId: string, @Param('alertId') alertId: string) {
    return this.alertService.resolveAlert(projectId, alertId);
  }

  // ===== Notification Channels =====

  @Post('channels')
  @ApiOperation({ summary: 'Create notification channel' })
  async createNotificationChannel(
    @Param('projectId') projectId: string,
    @Body() dto: CreateNotificationChannelDto,
  ) {
    return this.notificationChannelService.createNotificationChannel(projectId, dto);
  }

  @Get('channels')
  @ApiOperation({ summary: 'List notification channels' })
  async listNotificationChannels(@Param('projectId') projectId: string) {
    const channels = await this.notificationChannelService.listNotificationChannels(projectId);
    return { channels };
  }

  @Get('channels/:channelId')
  @ApiOperation({ summary: 'Get notification channel' })
  async getNotificationChannel(@Param('projectId') projectId: string, @Param('channelId') channelId: string) {
    return this.notificationChannelService.getNotificationChannel(projectId, channelId);
  }

  @Patch('channels/:channelId')
  @ApiOperation({ summary: 'Update notification channel' })
  async updateNotificationChannel(
    @Param('projectId') projectId: string,
    @Param('channelId') channelId: string,
    @Body() dto: UpdateNotificationChannelDto,
  ) {
    return this.notificationChannelService.updateNotificationChannel(projectId, channelId, dto);
  }

  @Delete('channels/:channelId')
  @ApiOperation({ summary: 'Delete notification channel' })
  async deleteNotificationChannel(@Param('projectId') projectId: string, @Param('channelId') channelId: string) {
    return this.notificationChannelService.deleteNotificationChannel(projectId, channelId);
  }

  // ===== Dashboard =====

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard stats' })
  async getDashboardStats(@Param('projectId') projectId: string) {
    return this.metricsService.getDashboardStats(projectId);
  }
}
