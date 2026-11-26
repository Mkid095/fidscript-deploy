import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { ScopeGuard } from '@/modules/auth/guards/scope-guard';
import { RequireScope } from '@/modules/auth/decorators/require-scope.decorator';
import { ProjectHealthService } from './project-health.service';

/**
 * The project's health, read-only.
 *
 * This endpoint answers the question "what is actually happening with this
 * project's services?" over the existing sources of truth. It takes no
 * write parameters — a `?refresh=true` only asks for a fresh probe.
 */
@ApiTags('project-health')
@Controller('projects/:projectId/health')
@UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class ProjectHealthController {
  constructor(private health: ProjectHealthService) {}

  @Get()
  @RequireScope('projects:read')
  @ApiOperation({ summary: "The project's live service health, rolled up from its real state" })
  evaluate(
    @Param('projectId') projectId: string,
    @Query('refresh') refresh?: string,
  ) {
    return this.health.evaluate(projectId, { force: refresh === 'true' });
  }
}
