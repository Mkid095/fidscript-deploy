import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailSenderIdentityService } from './sender-identity.service';
import { CreateSenderIdentityDto } from './dto/create-sender-identity.dto';

@ApiTags('email-sender-identities')
@Controller('projects/:projectId/email/sender-identities')
@UseGuards(JwtAuthGuard)
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
