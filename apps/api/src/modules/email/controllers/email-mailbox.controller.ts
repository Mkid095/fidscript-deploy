import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { EmailMailboxService } from '@/modules/email/services/mailbox.service';
import { CreateMailboxDto } from '@/modules/email/dto/create-mailbox.dto';
import { UpdateMailboxDto } from '@/modules/email/dto/update-mailbox.dto';
import { ResetMailboxPasswordDto } from '@/modules/email/dto/reset-mailbox-password.dto';
import { AddMailboxMemberDto, UpdateMailboxMemberDto } from '@/modules/email/dto/add-mailbox-member.dto';

@ApiTags('email-mailboxes')
@Controller('projects/:projectId/email/mailboxes')
@UseGuards(JwtAuthGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class EmailMailboxController {
  constructor(private mailboxService: EmailMailboxService) {}

  @Post()
  @ApiOperation({ summary: 'Create a mailbox (IMAP/SMTP account)' })
  createMailbox(@Param('projectId') projectId: string, @Body() dto: CreateMailboxDto) {
    return this.mailboxService.createMailbox(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all mailboxes' })
  listMailboxes(@Param('projectId') projectId: string, @Query('domainId') domainId?: string) {
    return this.mailboxService.listMailboxes(projectId, domainId);
  }

  @Get(':mailboxId')
  @ApiOperation({ summary: 'Get mailbox details' })
  getMailbox(@Param('projectId') projectId: string, @Param('mailboxId') mailboxId: string) {
    return this.mailboxService.getMailbox(projectId, mailboxId);
  }

  @Patch(':mailboxId')
  @ApiOperation({ summary: 'Update mailbox (name, quota, active status)' })
  updateMailbox(
    @Param('projectId') projectId: string,
    @Param('mailboxId') mailboxId: string,
    @Body() dto: UpdateMailboxDto,
  ) {
    return this.mailboxService.updateMailbox(projectId, mailboxId, dto);
  }

  @Post(':mailboxId/suspend')
  @ApiOperation({ summary: 'Suspend mailbox (disable login, keep emails)' })
  suspendMailbox(@Param('projectId') projectId: string, @Param('mailboxId') mailboxId: string) {
    return this.mailboxService.suspendMailbox(projectId, mailboxId);
  }

  @Post(':mailboxId/activate')
  @ApiOperation({ summary: 'Re-activate a suspended mailbox' })
  activateMailbox(@Param('projectId') projectId: string, @Param('mailboxId') mailboxId: string) {
    return this.mailboxService.activateMailbox(projectId, mailboxId);
  }

  @Post(':mailboxId/reset-password')
  @ApiOperation({ summary: 'Reset mailbox password — returns new password once' })
  resetMailboxPassword(
    @Param('projectId') projectId: string,
    @Param('mailboxId') mailboxId: string,
    @Body() dto: ResetMailboxPasswordDto,
  ) {
    return this.mailboxService.resetMailboxPassword(projectId, mailboxId, dto);
  }

  @Delete(':mailboxId')
  @ApiOperation({ summary: 'Delete mailbox and all its messages' })
  deleteMailbox(@Param('projectId') projectId: string, @Param('mailboxId') mailboxId: string) {
    return this.mailboxService.deleteMailbox(projectId, mailboxId);
  }

  // ─── Shared Mailbox Members ─────────────────────────────────────────────────

  @Post(':mailboxId/members')
  @ApiOperation({ summary: 'Add a user or API key as a mailbox member' })
  addMember(
    @Param('projectId') projectId: string,
    @Param('mailboxId') mailboxId: string,
    @Body() dto: AddMailboxMemberDto,
  ) {
    return this.mailboxService.addMember(mailboxId, projectId, dto);
  }

  @Get(':mailboxId/members')
  @ApiOperation({ summary: 'List all members of a mailbox' })
  listMembers(
    @Param('projectId') projectId: string,
    @Param('mailboxId') mailboxId: string,
  ) {
    return this.mailboxService.listMembers(mailboxId, projectId);
  }

  @Patch(':mailboxId/members/:memberId')
  @ApiOperation({ summary: 'Update a member role or permissions' })
  updateMember(
    @Param('projectId') projectId: string,
    @Param('mailboxId') mailboxId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMailboxMemberDto,
  ) {
    return this.mailboxService.updateMember(mailboxId, projectId, memberId, dto);
  }

  @Delete(':mailboxId/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from a mailbox' })
  removeMember(
    @Param('projectId') projectId: string,
    @Param('mailboxId') mailboxId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.mailboxService.removeMember(mailboxId, projectId, memberId);
  }
}
