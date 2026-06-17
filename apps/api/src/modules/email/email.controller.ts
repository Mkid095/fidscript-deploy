import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as crypto from 'crypto';
import { EmailService } from './email.service';
import {
  SendEmailDto,
  CreateEmailDomainDto,
  CreateMailboxDto,
  UpdateMailboxDto,
  ResetMailboxPasswordDto,
  CreateAliasDto,
  UpdateAliasDto,
  CreateSenderIdentityDto,
  CreateEmailApiKeyDto,
  ListMessagesDto,
  MarkMessagesReadDto,
  DeleteMessagesDto,
} from './dto/index';

@ApiTags('email')
@Controller('projects/:projectId/email')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailController {
  constructor(private emailService: EmailService) {}

  // ================================================================
  // DOMAINS
  // ================================================================

  @Post('domains')
  @ApiOperation({ summary: 'Add an email domain' })
  async createDomain(@Param('projectId') projectId: string, @Body() dto: CreateEmailDomainDto) {
    return this.emailService.createDomain(projectId, dto);
  }

  @Get('domains')
  @ApiOperation({ summary: 'List email domains' })
  async listDomains(@Param('projectId') projectId: string) {
    return this.emailService.listDomains(projectId);
  }

  @Get('domains/:domainId')
  @ApiOperation({ summary: 'Get email domain' })
  async getDomain(@Param('projectId') projectId: string, @Param('domainId') domainId: string) {
    return this.emailService.getDomain(projectId, domainId);
  }

  @Delete('domains/:domainId')
  @ApiOperation({ summary: 'Delete email domain and all its mailboxes' })
  async deleteDomain(@Param('projectId') projectId: string, @Param('domainId') domainId: string) {
    return this.emailService.deleteDomain(projectId, domainId);
  }

  @Post('domains/:domainId/verify')
  @ApiOperation({ summary: 'Re-verify domain DNS records (DKIM/SPF/DMARC/MX)' })
  async verifyDomain(@Param('projectId') projectId: string, @Param('domainId') domainId: string) {
    return this.emailService.verifyDomain(projectId, domainId);
  }

  // ================================================================
  // MAILBOXES
  // ================================================================

  @Post('mailboxes')
  @ApiOperation({ summary: 'Create a mailbox (IMAP/SMTP account)' })
  async createMailbox(@Param('projectId') projectId: string, @Body() dto: CreateMailboxDto) {
    return this.emailService.createMailbox(projectId, dto);
  }

  @Get('mailboxes')
  @ApiOperation({ summary: 'List all mailboxes' })
  async listMailboxes(@Param('projectId') projectId: string, @Query('domainId') domainId?: string) {
    return this.emailService.listMailboxes(projectId, domainId);
  }

  @Get('mailboxes/:mailboxId')
  @ApiOperation({ summary: 'Get mailbox details' })
  async getMailbox(@Param('projectId') projectId: string, @Param('mailboxId') mailboxId: string) {
    return this.emailService.getMailbox(projectId, mailboxId);
  }

  @Patch('mailboxes/:mailboxId')
  @ApiOperation({ summary: 'Update mailbox (name, quota, active status)' })
  async updateMailbox(
    @Param('projectId') projectId: string,
    @Param('mailboxId') mailboxId: string,
    @Body() dto: UpdateMailboxDto,
  ) {
    return this.emailService.updateMailbox(projectId, mailboxId, dto);
  }

  @Post('mailboxes/:mailboxId/suspend')
  @ApiOperation({ summary: 'Suspend mailbox (disable login, keep emails)' })
  async suspendMailbox(@Param('projectId') projectId: string, @Param('mailboxId') mailboxId: string) {
    return this.emailService.suspendMailbox(projectId, mailboxId);
  }

  @Post('mailboxes/:mailboxId/activate')
  @ApiOperation({ summary: 'Re-activate a suspended mailbox' })
  async activateMailbox(@Param('projectId') projectId: string, @Param('mailboxId') mailboxId: string) {
    return this.emailService.activateMailbox(projectId, mailboxId);
  }

  @Post('mailboxes/:mailboxId/reset-password')
  @ApiOperation({ summary: 'Reset mailbox password — returns new password once' })
  async resetMailboxPassword(
    @Param('projectId') projectId: string,
    @Param('mailboxId') mailboxId: string,
    @Body() dto: ResetMailboxPasswordDto,
  ) {
    return this.emailService.resetMailboxPassword(projectId, mailboxId, dto);
  }

  @Delete('mailboxes/:mailboxId')
  @ApiOperation({ summary: 'Delete mailbox and all its messages' })
  async deleteMailbox(@Param('projectId') projectId: string, @Param('mailboxId') mailboxId: string) {
    return this.emailService.deleteMailbox(projectId, mailboxId);
  }

  // ================================================================
  // ALIASES
  // ================================================================

  @Post('aliases')
  @ApiOperation({ summary: 'Create an alias (forwarding address)' })
  async createAlias(@Param('projectId') projectId: string, @Body() dto: CreateAliasDto) {
    return this.emailService.createAlias(projectId, dto);
  }

  @Get('aliases')
  @ApiOperation({ summary: 'List all aliases' })
  async listAliases(@Param('projectId') projectId: string, @Query('domainId') domainId?: string) {
    return this.emailService.listAliases(projectId, domainId);
  }

  @Patch('aliases/:aliasId')
  @ApiOperation({ summary: 'Update alias (targets, active status)' })
  async updateAlias(
    @Param('projectId') projectId: string,
    @Param('aliasId') aliasId: string,
    @Body() dto: UpdateAliasDto,
  ) {
    return this.emailService.updateAlias(projectId, aliasId, dto);
  }

  @Delete('aliases/:aliasId')
  @ApiOperation({ summary: 'Delete alias' })
  async deleteAlias(@Param('projectId') projectId: string, @Param('aliasId') aliasId: string) {
    return this.emailService.deleteAlias(projectId, aliasId);
  }

  // ================================================================
  // SENDER IDENTITIES
  // ================================================================

  @Post('sender-identities')
  @ApiOperation({ summary: 'Create a sender identity (for API sending)' })
  async createSenderIdentity(@Param('projectId') projectId: string, @Body() dto: CreateSenderIdentityDto) {
    return this.emailService.createSenderIdentity(projectId, dto);
  }

  @Get('sender-identities')
  @ApiOperation({ summary: 'List sender identities' })
  async listSenderIdentities(@Param('projectId') projectId: string, @Query('domainId') domainId?: string) {
    return this.emailService.listSenderIdentities(projectId, domainId);
  }

  @Delete('sender-identities/:identityId')
  @ApiOperation({ summary: 'Delete sender identity' })
  async deleteSenderIdentity(@Param('projectId') projectId: string, @Param('identityId') identityId: string) {
    return this.emailService.deleteSenderIdentity(projectId, identityId);
  }

  // ================================================================
  // API KEYS
  // ================================================================

  @Post('api-keys')
  @ApiOperation({ summary: 'Create an API key (Resend-style — key shown only once)' })
  async createEmailApiKey(@Param('projectId') projectId: string, @Body() dto: CreateEmailApiKeyDto) {
    return this.emailService.createEmailApiKey(projectId, dto);
  }

  @Get('api-keys')
  @ApiOperation({ summary: 'List API keys (without secrets)' })
  async listEmailApiKeys(@Param('projectId') projectId: string) {
    return this.emailService.listEmailApiKeys(projectId);
  }

  @Delete('api-keys/:apiKeyId')
  @ApiOperation({ summary: 'Delete API key' })
  async deleteEmailApiKey(@Param('projectId') projectId: string, @Param('apiKeyId') apiKeyId: string) {
    return this.emailService.deleteEmailApiKey(projectId, apiKeyId);
  }

  // ================================================================
  // SEND EMAIL
  // ================================================================

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send an email (via Stalwart SMTP submission)' })
  async sendEmail(@Param('projectId') projectId: string, @Body() dto: SendEmailDto) {
    return this.emailService.sendEmail(projectId, dto);
  }

  // ================================================================
  // MESSAGES (Inbox)
  // ================================================================

  @Get('messages')
  @ApiOperation({ summary: 'List messages (supports folder and unread filters)' })
  async listMessages(@Param('projectId') projectId: string, @Query() dto: ListMessagesDto) {
    return this.emailService.listMessages(projectId, dto);
  }

  @Get('messages/:messageId')
  @ApiOperation({ summary: 'Get message metadata' })
  async getMessage(@Param('projectId') projectId: string, @Param('messageId') messageId: string) {
    return this.emailService.getMessage(projectId, messageId);
  }

  @Patch('messages/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark messages as read/unread' })
  async markMessagesRead(@Param('projectId') projectId: string, @Body() dto: MarkMessagesReadDto) {
    return this.emailService.markMessagesRead(projectId, dto);
  }

  @Patch('messages/:messageId/star')
  @ApiOperation({ summary: 'Star or unstar a message' })
  async markMessageStarred(
    @Param('projectId') projectId: string,
    @Param('messageId') messageId: string,
    @Query('starred') starred: string,
  ) {
    return this.emailService.markMessageStarred(projectId, messageId, starred === 'true');
  }

  @Delete('messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete messages (with storage cleanup in MinIO)' })
  async deleteMessages(@Param('projectId') projectId: string, @Body() dto: DeleteMessagesDto) {
    return this.emailService.deleteMessages(projectId, dto);
  }

  // ================================================================
  // CATCH-ALL RULES
  // ================================================================

  @Post('domains/:domainId/catch-all')
  @ApiOperation({ summary: 'Set or update the catch-all rule for a domain' })
  async setCatchAll(
    @Param('projectId') projectId: string,
    @Param('domainId') domainId: string,
    @Body()
    dto: { targetType: 'mailbox' | 'external'; targetId?: string; targetAddress?: string },
  ) {
    return this.emailService.setCatchAll(projectId, domainId, dto);
  }

  @Delete('domains/:domainId/catch-all')
  @ApiOperation({ summary: 'Delete catch-all rule for a domain' })
  async deleteCatchAll(@Param('projectId') projectId: string, @Param('domainId') domainId: string) {
    return this.emailService.deleteCatchAll(projectId, domainId);
  }
}

// ================================================================
// INBOUND WEBHOOK (called by Stalwart sieve)
// Secured with X-Stalwart-Signature HMAC-SHA256 verification
// ================================================================
@Controller('email/inbound')
export class EmailInboundController {
  constructor(
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  private verifySignature(body: string, signature: string): boolean {
    const secret = this.configService.get('STALWART_WEBHOOK_SECRET', '');
    if (!secret) return true; // Skip verification if not configured (dev only)
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stalwart inbound email webhook (Sieve notify)' })
  async inboundWebhook(
    @Headers('x-stalwart-signature') signature: string,
    @Body() payload: {
      from: string;
      to: string;
      subject: string;
      body?: string;
      sizeBytes?: number;
      spamScore?: number;
    },
  ) {
    // Verify HMAC-SHA256 signature from Stalwart
    const rawBody = JSON.stringify(payload);
    if (signature && !this.verifySignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return this.emailService.handleInboundEmail({
      from: payload.from,
      to: payload.to,
      subject: payload.subject ?? '',
      sizeBytes: payload.sizeBytes ?? 0,
      spamScore: payload.spamScore,
    });
  }
}

// ================================================================
// EMAIL EVENTS WEBHOOK (bounce, delivery notification from Stalwart)
// ================================================================
@Controller('email/events')
export class EmailEventsController {
  constructor(
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  private verifySignature(body: string, signature: string): boolean {
    const secret = this.configService.get('STALWART_WEBHOOK_SECRET', '');
    if (!secret) return true;
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  @Post('bounce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stalwart bounce webhook — updates message status' })
  async handleBounce(
    @Headers('x-stalwart-signature') signature: string,
    @Body()
    payload: {
      messageId: string;
      to: string;
      error: string;
      code?: string;
    },
  ) {
    const rawBody = JSON.stringify(payload);
    if (signature && !this.verifySignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    return this.emailService.handleBounce(payload);
  }

  @Post('complaint')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stalwart complaint (FBL) webhook — adds recipient to suppression list' })
  async handleComplaint(
    @Headers('x-stalwart-signature') signature: string,
    @Body()
    payload: { email: string; userAgent?: string },
  ) {
    const rawBody = JSON.stringify(payload);
    if (signature && !this.verifySignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    return this.emailService.handleComplaint(payload);
  }
}
