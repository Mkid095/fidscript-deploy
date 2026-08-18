import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { ScopeGuard } from '@/modules/auth/guards/scope-guard';
import { RequireScope } from '@/modules/auth/decorators/require-scope.decorator';
import { MetricsService } from '@/modules/monitoring/services/metrics.service';
import { GetMetricsDto } from '@/modules/monitoring/dto/index';

@ApiTags('monitoring/metrics')
@Controller('projects/:projectId/monitoring/metrics')
@UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class MetricsController {
  constructor(private metrics: MetricsService) {}

  @Get()
  @RequireScope('monitoring:read')
  async getMetrics(@Param('projectId') projectId: string, @Query() dto: GetMetricsDto) {
    return this.metrics.getMetrics(projectId, dto);
  }

  @Get(':metric/summary')
  @RequireScope('monitoring:read')
  async getMetricSummary(
    @Param('projectId') projectId: string,
    @Param('metric') metric: string,
    @Query('interval') interval?: string,
  ) {
    return this.metrics.getMetricSummary(projectId, metric, interval);
  }

  @Post()
  @RequireScope('monitoring:write')
  async recordMetric(
    @Param('projectId') projectId: string,
    @Body() body: { metric: string; value: number; labels?: Record<string, string> },
  ) {
    return this.metrics.recordMetric(projectId, body.metric, body.value, body.labels);
  }

  @Get('stats')
  @RequireScope('monitoring:read')
  async getDashboardStats(@Param('projectId') projectId: string) {
    return this.metrics.getDashboardStats(projectId);
  }
}
