import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { EmailSenderIdentityService } from '@/modules/email/services/sender-identity.service';
import { CreateSenderIdentityDto } from '@/modules/email/dto/create-sender-identity.dto';

@ApiTags('email-sender-identities')
@Controller('projects/:projectId/email/sender-identities')
@UseGuards(ApiKeyOrJwtGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class EmailSenderIdentityController {
  constructor(private senderIdentityService: EmailSenderIdentityService) {}

  @Post()
  @ApiOperation({ summary: 'Create a sender identity (for API sending)' })
  createSenderIdentity(@Param('projectId') projectId: string, @Body() dto: CreateSenderIdentityDto) {
    return this.senderIdentityService.createSenderIdentity(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List sender identities' })
  listSenderIdentities(@Param('projectId') projectId: string, @Query('domainId') domainId?: string) {
    return this.senderIdentityService.listSenderIdentities(projectId, domainId);
  }

  @Delete(':identityId')
  @ApiOperation({ summary: 'Delete sender identity' })
  deleteSenderIdentity(@Param('projectId') projectId: string, @Param('identityId') identityId: string) {
    return this.senderIdentityService.deleteSenderIdentity(projectId, identityId);
  }
}
