import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { EmailMailboxService } from '@/modules/email/services/mailbox.service';
import { CreateMailboxDto } from '@/modules/email/dto/create-mailbox.dto';
import { UpdateMailboxDto } from '@/modules/email/dto/update-mailbox.dto';
import { ResetMailboxPasswordDto } from '@/modules/email/dto/reset-mailbox-password.dto';

@ApiTags('email-mailboxes')
@Controller('projects/:projectId/email/mailboxes')
@UseGuards(JwtAuthGuard)
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
}
