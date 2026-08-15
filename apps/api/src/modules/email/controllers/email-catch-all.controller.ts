import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { EmailCatchallCrudService } from '@/modules/email/services/email-catchall-crud.service';

@ApiTags('email-catch-all')
@Controller('projects/:projectId/email/domains')
@UseGuards(JwtAuthGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class EmailCatchAllController {
  constructor(private crud: EmailCatchallCrudService) {}

  @Get(':domainId/catch-all')
  @ApiOperation({ summary: 'Get the catch-all rule for a domain' })
  getCatchAll(
    @Param('projectId') projectId: string,
    @Param('domainId') domainId: string,
  ) {
    return this.crud.getCatchAll(projectId, domainId);
  }

  @Post(':domainId/catch-all')
  @ApiOperation({ summary: 'Set or update the catch-all rule for a domain' })
  setCatchAll(
    @Param('projectId') projectId: string,
    @Param('domainId') domainId: string,
    @Body() dto: {
      targetType: 'mailbox' | 'external' | 'webhook';
      targetId?: string;
      targetAddress?: string;
      webhookUrl?: string;
    },
  ) {
    return this.crud.setCatchAll(projectId, domainId, dto);
  }

  @Delete(':domainId/catch-all')
  @ApiOperation({ summary: 'Delete catch-all rule for a domain' })
  deleteCatchAll(@Param('projectId') projectId: string, @Param('domainId') domainId: string) {
    return this.crud.deleteCatchAll(projectId, domainId);
  }
}
