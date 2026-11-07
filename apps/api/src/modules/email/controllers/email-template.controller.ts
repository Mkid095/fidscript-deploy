/**
 * Email template read-side controller — list / get / preview. The
 * mutating endpoints (create / update / delete / send / send-batch) live
 * in EmailTemplateActionController.
 */
import { Controller, Get, Param, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { EmailTemplateService } from '@/modules/email/services/email-template.service';

@ApiTags('email-templates')
@Controller('projects/:projectId/email/templates')
@UseGuards(ApiKeyOrJwtGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class EmailTemplateController {
  constructor(private templateService: EmailTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'List email templates for a project' })
  list(@Param('projectId') projectId: string, @Req() req: Request) {
    this.assertCanAccessProject(req, projectId);
    return this.templateService.list(projectId);
  }

  @Get(':templateId')
  @ApiOperation({ summary: 'Get a single template' })
  get(@Param('projectId') projectId: string, @Param('templateId') templateId: string, @Req() req: Request) {
    this.assertCanAccessProject(req, projectId);
    return this.templateService.get(projectId, templateId);
  }

  @Get(':templateId/preview')
  @ApiOperation({ summary: 'Preview a rendered template with dummy variables' })
  preview(@Param('projectId') projectId: string, @Param('templateId') templateId: string, @Req() req: Request) {
    this.assertCanAccessProject(req, projectId);
    return this.templateService.preview(projectId, templateId);
  }

  private assertCanAccessProject(req: Request, projectId: string): void {
    const user = req.user as { isApiKey?: boolean; projectId?: string } | undefined;
    if (user?.isApiKey && user.projectId !== projectId) {
      throw new BadRequestException('API key does not have access to this project');
    }
  }
}
