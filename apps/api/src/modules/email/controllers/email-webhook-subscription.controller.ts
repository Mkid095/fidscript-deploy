/**
 * Email webhook subscription CRUD + test.
 * Per-project webhook registrations for email lifecycle events.
 */
import {
  Controller, Get, Post, Patch, Delete, Body, Param, Req,
  UseGuards, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { EmailWebhookSubscriptionService } from '@/modules/email/services/email-webhook-subscription.service';

@ApiTags('email-webhooks')
@Controller('projects/:projectId/email/webhooks')
@UseGuards(ApiKeyOrJwtGuard)
@ApiBearerAuth()
export class EmailWebhookSubscriptionController {
  constructor(private webhookService: EmailWebhookSubscriptionService) {}

  @Post()
  @ApiOperation({ summary: 'Register an email webhook subscription' })
  create(
    @Param('projectId') projectId: string,
    @Body() body: { url: string; events: string[] },
    @Req() req: Request,
  ) {
    this.assertAccess(req, projectId);
    if (!body.url?.startsWith('http')) throw new BadRequestException('url must be a valid HTTP(S) URL');
    if (!body.events?.length) throw new BadRequestException('events array required');
    return this.webhookService.create(projectId, body);
  }

  @Get()
  @ApiOperation({ summary: 'List email webhook subscriptions' })
  list(@Param('projectId') projectId: string, @Req() req: Request) {
    this.assertAccess(req, projectId);
    return this.webhookService.list(projectId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an email webhook subscription' })
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: Partial<{ url: string; events: string[]; isActive: boolean }>,
    @Req() req: Request,
  ) {
    this.assertAccess(req, projectId);
    return this.webhookService.update(projectId, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an email webhook subscription' })
  delete(@Param('projectId') projectId: string, @Param('id') id: string, @Req() req: Request) {
    this.assertAccess(req, projectId);
    return this.webhookService.delete(projectId, id);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a test event to the webhook URL' })
  test(@Param('projectId') projectId: string, @Param('id') id: string, @Req() req: Request) {
    this.assertAccess(req, projectId);
    return this.webhookService.test(projectId, id);
  }

  private assertAccess(req: Request, projectId: string) {
    const user = req.user as { isApiKey?: boolean; projectId?: string } | undefined;
    if (user?.isApiKey && user.projectId !== projectId) {
      throw new BadRequestException('API key does not have access to this project');
    }
  }
}
