import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { ScopeGuard } from '@/modules/auth/guards/scope-guard';
import { RequireScope } from '@/modules/auth/decorators/require-scope.decorator';
import { AlertRuleService } from '@/modules/monitoring/services/alert-rule.service';
import { AlertService } from '@/modules/monitoring/services/alert.service';
import { CreateAlertRuleDto, UpdateAlertRuleDto, GetAlertsDto } from '@/modules/monitoring/dto/index';

@ApiTags('monitoring/alerts')
@Controller('projects/:projectId/monitoring/alerts')
@UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class AlertsController {
  constructor(
    private alertRuleService: AlertRuleService,
    private alertService: AlertService,
  ) {}

  // Alert Rules
  @Post('rules')
  @RequireScope('monitoring:write')
  async createAlertRule(@Param('projectId') projectId: string, @Body() dto: CreateAlertRuleDto) {
    return this.alertRuleService.createAlertRule(projectId, dto);
  }

  @Get('rules')
  @RequireScope('monitoring:read')
  async listAlertRules(@Param('projectId') projectId: string) {
    const rules = await this.alertRuleService.listAlertRules(projectId);
    return { rules };
  }

  @Get('rules/:ruleId')
  @RequireScope('monitoring:read')
  async getAlertRule(@Param('projectId') projectId: string, @Param('ruleId') ruleId: string) {
    return this.alertRuleService.getAlertRule(projectId, ruleId);
  }

  @Patch('rules/:ruleId')
  @RequireScope('monitoring:write')
  async updateAlertRule(@Param('projectId') projectId: string, @Param('ruleId') ruleId: string, @Body() dto: UpdateAlertRuleDto) {
    return this.alertRuleService.updateAlertRule(projectId, ruleId, dto);
  }

  @Delete('rules/:ruleId')
  @RequireScope('monitoring:write')
  async deleteAlertRule(@Param('projectId') projectId: string, @Param('ruleId') ruleId: string) {
    return this.alertRuleService.deleteAlertRule(projectId, ruleId);
  }

  // Alerts
  @Get()
  @RequireScope('monitoring:read')
  async getAlerts(@Param('projectId') projectId: string, @Query() dto: GetAlertsDto) {
    const alerts = await this.alertService.getAlerts(projectId, dto);
    return { alerts };
  }

  @Get(':alertId')
  @RequireScope('monitoring:read')
  async getAlert(@Param('projectId') projectId: string, @Param('alertId') alertId: string) {
    return this.alertService.getAlert(projectId, alertId);
  }

  @Post(':alertId/acknowledge')
  @RequireScope('monitoring:write')
  @HttpCode(200)
  async acknowledgeAlert(@Param('projectId') projectId: string, @Param('alertId') alertId: string) {
    return this.alertService.acknowledgeAlert(projectId, alertId);
  }

  @Post(':alertId/resolve')
  @RequireScope('monitoring:write')
  @HttpCode(200)
  async resolveAlert(@Param('projectId') projectId: string, @Param('alertId') alertId: string) {
    return this.alertService.resolveAlert(projectId, alertId);
  }
}
