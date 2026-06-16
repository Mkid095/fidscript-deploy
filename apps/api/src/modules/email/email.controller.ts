import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { EmailService } from './email.service.js';
import { SendEmailDto, CreateMailboxDto, CreateAliasDto, VerifyDomainDto, GetEmailsDto } from './dto/index.js';

@ApiTags('email')
@Controller('projects/:projectId/email')
export class EmailController {
  constructor(private emailService: EmailService) {}

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send email' })
  async sendEmail(@Param('projectId') projectId: string, @Body() dto: SendEmailDto) {
    return this.emailService.sendEmail(projectId, dto);
  }

  @Post('mailboxes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create mailbox' })
  async createMailbox(@Param('projectId') projectId: string, @Body() dto: CreateMailboxDto) {
    return this.emailService.createMailbox(projectId, dto);
  }

  @Get('mailboxes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List mailboxes' })
  async listMailboxes(@Param('projectId') projectId: string) {
    const mailboxes = await this.emailService.listMailboxes(projectId);
    return { mailboxes };
  }

  @Delete('mailboxes/:mailboxId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete mailbox' })
  async deleteMailbox(@Param('projectId') projectId: string, @Param('mailboxId') mailboxId: string) {
    return this.emailService.deleteMailbox(projectId, mailboxId);
  }

  @Post('aliases')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create alias' })
  async createAlias(@Param('projectId') projectId: string, @Body() dto: CreateAliasDto) {
    return this.emailService.createAlias(projectId, dto);
  }

  @Get('aliases')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List aliases' })
  async listAliases(@Param('projectId') projectId: string) {
    const aliases = await this.emailService.listAliases(projectId);
    return { aliases };
  }

  @Delete('aliases/:aliasId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete alias' })
  async deleteAlias(@Param('projectId') projectId: string, @Param('aliasId') aliasId: string) {
    return this.emailService.deleteAlias(projectId, aliasId);
  }

  @Post('verify-domain')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify domain' })
  async verifyDomain(@Param('projectId') projectId: string, @Body() dto: VerifyDomainDto) {
    return this.emailService.verifyDomain(projectId, dto);
  }

  @Get('verify-domain/:domain')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get domain verification status' })
  async getDomainVerification(@Param('projectId') projectId: string, @Param('domain') domain: string) {
    return this.emailService.getDomainVerification(projectId, domain);
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List email logs' })
  async listEmailLogs(@Param('projectId') projectId: string, @Query() dto: GetEmailsDto) {
    const logs = await this.emailService.listEmailLogs(projectId, dto);
    return { logs };
  }
}