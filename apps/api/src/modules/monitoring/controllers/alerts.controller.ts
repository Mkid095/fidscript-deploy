import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { AlertRuleService } from '@/modules/monitoring/services/alert-rule.service';
import { AlertService } from '@/modules/monitoring/services/alert.service';
import { CreateAlertRuleDto, UpdateAlertRuleDto, GetAlertsDto } from '@/modules/monitoring/dto/index';

@ApiTags('monitoring/alerts')
@Controller('projects/:projectId/monitoring/alerts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AlertsController {
  constructor(
    private alertRuleService: AlertRuleService,
    private alertService: AlertService,
  ) {}

  // Alert Rules
  @Post('rules')
  async createAlertRule(@Param('projectId') projectId: string, @Body() dto: CreateAlertRuleDto) {
    return this.alertRuleService.createAlertRule(projectId, dto);
  }

  @Get('rules')
  async listAlertRules(@Param('projectId') projectId: string) {
    const rules = await this.alertRuleService.listAlertRules(projectId);
    return { rules };
  }

  @Get('rules/:ruleId')
  async getAlertRule(@Param('projectId') projectId: string, @Param('ruleId') ruleId: string) {
    return this.alertRuleService.getAlertRule(projectId, ruleId);
  }

  @Patch('rules/:ruleId')
  async updateAlertRule(@Param('projectId') projectId: string, @Param('ruleId') ruleId: string, @Body() dto: UpdateAlertRuleDto) {
    return this.alertRuleService.updateAlertRule(projectId, ruleId, dto);
  }

  @Delete('rules/:ruleId')
  async deleteAlertRule(@Param('projectId') projectId: string, @Param('ruleId') ruleId: string) {
    return this.alertRuleService.deleteAlertRule(projectId, ruleId);
  }

  // Alerts
  @Get()
  async getAlerts(@Param('projectId') projectId: string, @Query() dto: GetAlertsDto) {
    const alerts = await this.alertService.getAlerts(projectId, dto);
    return { alerts };
  }

  @Get(':alertId')
  async getAlert(@Param('projectId') projectId: string, @Param('alertId') alertId: string) {
    return this.alertService.getAlert(projectId, alertId);
  }

  @Post(':alertId/acknowledge')
  @HttpCode(200)
  async acknowledgeAlert(@Param('projectId') projectId: string, @Param('alertId') alertId: string) {
    return this.alertService.acknowledgeAlert(projectId, alertId);
  }

  @Post(':alertId/resolve')
  @HttpCode(200)
  async resolveAlert(@Param('projectId') projectId: string, @Param('alertId') alertId: string) {
    return this.alertService.resolveAlert(projectId, alertId);
  }
}
