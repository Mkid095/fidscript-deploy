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
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { MonitoringService } from './monitoring.service.js';
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  GetMetricsDto,
  GetAlertsDto,
  CreateNotificationChannelDto,
  UpdateNotificationChannelDto,
} from './dto/index.js';

@ApiTags('monitoring')
@Controller('projects/:projectId/monitoring')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MonitoringController {
  constructor(private monitoringService: MonitoringService) {}

  // ===== Metrics =====

  @Get('metrics')
  @ApiOperation({ summary: 'Get metrics' })
  async getMetrics(@Param('projectId') projectId: string, @Query() dto: GetMetricsDto) {
    return this.monitoringService.getMetrics(projectId, dto);
  }

  @Get('metrics/:metric/summary')
  @ApiOperation({ summary: 'Get metric summary' })
  async getMetricSummary(
    @Param('projectId') projectId: string,
    @Param('metric') metric: string,
    @Query('interval') interval?: string,
  ) {
    return this.monitoringService.getMetricSummary(projectId, metric, interval);
  }

  @Post('metrics')
  @ApiOperation({ summary: 'Record metric' })
  async recordMetric(
    @Param('projectId') projectId: string,
    @Body() body: { metric: string; value: number; labels?: Record<string, string> },
  ) {
    return this.monitoringService.recordMetric(projectId, body.metric, body.value, body.labels);
  }

  // ===== Alert Rules =====

  @Post('alerts/rules')
  @ApiOperation({ summary: 'Create alert rule' })
  async createAlertRule(@Param('projectId') projectId: string, @Body() dto: CreateAlertRuleDto) {
    return this.monitoringService.createAlertRule(projectId, dto);
  }

  @Get('alerts/rules')
  @ApiOperation({ summary: 'List alert rules' })
  async listAlertRules(@Param('projectId') projectId: string) {
    const rules = await this.monitoringService.listAlertRules(projectId);
    return { rules };
  }

  @Get('alerts/rules/:ruleId')
  @ApiOperation({ summary: 'Get alert rule' })
  async getAlertRule(@Param('projectId') projectId: string, @Param('ruleId') ruleId: string) {
    return this.monitoringService.getAlertRule(projectId, ruleId);
  }

  @Patch('alerts/rules/:ruleId')
  @ApiOperation({ summary: 'Update alert rule' })
  async updateAlertRule(
    @Param('projectId') projectId: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateAlertRuleDto,
  ) {
    return this.monitoringService.updateAlertRule(projectId, ruleId, dto);
  }

  @Delete('alerts/rules/:ruleId')
  @ApiOperation({ summary: 'Delete alert rule' })
  async deleteAlertRule(@Param('projectId') projectId: string, @Param('ruleId') ruleId: string) {
    return this.monitoringService.deleteAlertRule(projectId, ruleId);
  }

  // ===== Alerts =====

  @Get('alerts')
  @ApiOperation({ summary: 'Get alerts' })
  async getAlerts(@Param('projectId') projectId: string, @Query() dto: GetAlertsDto) {
    const alerts = await this.monitoringService.getAlerts(projectId, dto);
    return { alerts };
  }

  @Get('alerts/:alertId')
  @ApiOperation({ summary: 'Get alert' })
  async getAlert(@Param('projectId') projectId: string, @Param('alertId') alertId: string) {
    return this.monitoringService.getAlert(projectId, alertId);
  }

  @Post('alerts/:alertId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge alert' })
  async acknowledgeAlert(@Param('projectId') projectId: string, @Param('alertId') alertId: string) {
    return this.monitoringService.acknowledgeAlert(projectId, alertId);
  }

  @Post('alerts/:alertId/resolve')
  @ApiOperation({ summary: 'Resolve alert' })
  async resolveAlert(@Param('projectId') projectId: string, @Param('alertId') alertId: string) {
    return this.monitoringService.resolveAlert(projectId, alertId);
  }

  // ===== Notification Channels =====

  @Post('channels')
  @ApiOperation({ summary: 'Create notification channel' })
  async createNotificationChannel(
    @Param('projectId') projectId: string,
    @Body() dto: CreateNotificationChannelDto,
  ) {
    return this.monitoringService.createNotificationChannel(projectId, dto);
  }

  @Get('channels')
  @ApiOperation({ summary: 'List notification channels' })
  async listNotificationChannels(@Param('projectId') projectId: string) {
    const channels = await this.monitoringService.listNotificationChannels(projectId);
    return { channels };
  }

  @Get('channels/:channelId')
  @ApiOperation({ summary: 'Get notification channel' })
  async getNotificationChannel(@Param('projectId') projectId: string, @Param('channelId') channelId: string) {
    return this.monitoringService.getNotificationChannel(projectId, channelId);
  }

  @Patch('channels/:channelId')
  @ApiOperation({ summary: 'Update notification channel' })
  async updateNotificationChannel(
    @Param('projectId') projectId: string,
    @Param('channelId') channelId: string,
    @Body() dto: UpdateNotificationChannelDto,
  ) {
    return this.monitoringService.updateNotificationChannel(projectId, channelId, dto);
  }

  @Delete('channels/:channelId')
  @ApiOperation({ summary: 'Delete notification channel' })
  async deleteNotificationChannel(@Param('projectId') projectId: string, @Param('channelId') channelId: string) {
    return this.monitoringService.deleteNotificationChannel(projectId, channelId);
  }

  // ===== Dashboard =====

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard stats' })
  async getDashboardStats(@Param('projectId') projectId: string) {
    return this.monitoringService.getDashboardStats(projectId);
  }
}