/**
 * Transactional email template API.
 *
 * Endpoints:
 *   CRUD:           GET/POST/PATCH/DELETE  /projects/:projectId/email/templates
 *   Preview:        GET                   /projects/:projectId/email/templates/:id/preview
 *   Send with vars: POST                  /projects/:projectId/email/templates/:id/send
 *   Batch send:     POST                  /projects/:projectId/email/templates/send-batch
 */
import {
  Controller, Get, Post, Patch, Delete, Body, Param, Req,
  UseGuards, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { EmailTemplateService } from '@/modules/email/services/email-template.service';
import { SmtpSendService } from '@/modules/email/smtp/smtp-send.service';
import { PrismaService } from '@/prisma/prisma.service';

@ApiTags('email-templates')
@Controller('projects/:projectId/email/templates')
@UseGuards(ApiKeyOrJwtGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class EmailTemplateController {
  constructor(
    private templateService: EmailTemplateService,
    private smtpSend: SmtpSendService,
    private prisma: PrismaService,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create an email template' })
  create(@Param('projectId') projectId: string, @Body() body: any, @Req() req: Request) {
    this.assertCanAccessProject(req, projectId);
    return this.templateService.create(projectId, body);
  }

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

  @Patch(':templateId')
  @ApiOperation({ summary: 'Update a template' })
  update(
    @Param('projectId') projectId: string,
    @Param('templateId') templateId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    this.assertCanAccessProject(req, projectId);
    return this.templateService.update(projectId, templateId, body);
  }

  @Delete(':templateId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a template (soft-delete: sets isActive=false)' })
  delete(@Param('projectId') projectId: string, @Param('templateId') templateId: string, @Req() req: Request) {
    this.assertCanAccessProject(req, projectId);
    return this.templateService.delete(projectId, templateId);
  }

  // ── Render + Preview ───────────────────────────────────────────────────

  @Get(':templateId/preview')
  @ApiOperation({ summary: 'Preview a rendered template with dummy variables' })
  preview(@Param('projectId') projectId: string, @Param('templateId') templateId: string, @Req() req: Request) {
    this.assertCanAccessProject(req, projectId);
    return this.templateService.preview(projectId, templateId);
  }

  // ── Send ──────────────────────────────────────────────────────────────

  @Post(':templateId/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Render and send a templated email' })
  async send(
    @Param('projectId') projectId: string,
    @Param('templateId') templateId: string,
    @Body() body: { to: string; from?: string; replyTo?: string; variables: Record<string, string>; apiKeyId?: string },
    @Req() req: Request,
  ) {
    this.assertCanAccessProject(req, projectId);

    const template = await this.templateService.get(projectId, templateId);
    this.templateService.validateVariables(template, body.variables ?? {});

    const rendered = this.templateService.render(template, body.variables ?? {});

    const from = body.from ?? template.fromAddress;
    const sendDto = {
      from,
      to: body.to,
      subject: rendered.subject,
      text: rendered.text ?? undefined,
      html: rendered.html ?? undefined,
      replyTo: body.replyTo,
      apiKeyId: body.apiKeyId,
    };

    const result = await this.smtpSend.send(projectId, sendDto);

    // Record template usage
    try {
      await (this.prisma as any).emailMessageTemplate.create({
        data: {
          messageId: result.messageId,
          templateId: template.id,
          variables: body.variables ?? {},
        },
      });
    } catch { /* non-fatal */ }

    return {
      messageId: result.messageId,
      status: result.status,
      rendered: { subject: rendered.subject },
    };
  }

  // ── Batch send ────────────────────────────────────────────────────────

  @Post('send-batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send the same template to multiple recipients with individual variables' })
  async sendBatch(
    @Param('projectId') projectId: string,
    @Body() body: {
      templateId: string;
      from?: string;
      replyTo?: string;
      // Array of { to, variables }
      recipients: Array<{ to: string; variables: Record<string, string> }>;
      apiKeyId?: string;
    },
    @Req() req: Request,
  ) {
    this.assertCanAccessProject(req, projectId);

    if (!body.recipients?.length) {
      throw new BadRequestException('recipients array is required and non-empty');
    }
    if (body.recipients.length > 1000) {
      throw new BadRequestException('Maximum 1000 recipients per batch');
    }

    const template = await this.templateService.get(projectId, body.templateId);
    const results: Array<{ to: string; messageId: string; status: string; error?: string }> = [];

    for (const recipient of body.recipients) {
      try {
        this.templateService.validateVariables(template, recipient.variables ?? {});
        const rendered = this.templateService.render(template, recipient.variables ?? {});
        const from = body.from ?? template.fromAddress;
        const result = await this.smtpSend.send(projectId, {
          from,
          to: recipient.to,
          subject: rendered.subject,
          text: rendered.text ?? undefined,
          html: rendered.html ?? undefined,
          replyTo: body.replyTo,
          apiKeyId: body.apiKeyId,
        });

        try {
          await (this.prisma as any).emailMessageTemplate.create({
            data: {
              messageId: result.messageId,
              templateId: template.id,
              variables: recipient.variables ?? {},
            },
          });
        } catch { /* non-fatal */ }

        results.push({ to: recipient.to, messageId: result.messageId, status: result.status });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ to: recipient.to, messageId: '', status: 'FAILED', error: msg });
      }
    }

    return {
      templateId: template.id,
      total: body.recipients.length,
      sent: results.filter(r => r.status === 'QUEUED').length,
      failed: results.filter(r => r.status === 'FAILED').length,
      results,
    };
  }

  private assertCanAccessProject(req: Request, projectId: string): void {
    const user = req.user as { isApiKey?: boolean; projectId?: string } | undefined;
    if (user?.isApiKey && user.projectId !== projectId) {
      throw new BadRequestException('API key does not have access to this project');
    }
  }
}
