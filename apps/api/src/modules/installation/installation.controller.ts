import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InstallationOrchestratorService } from './installation.service';
import { ConfigureInstallationDto, DiscoveryResult, StepValidationIssue } from './dto';
import { Response } from 'express';

@Controller('installation')
export class InstallationController {
  constructor(private readonly orchestrator: InstallationOrchestratorService) {}

  /** Discovery — what does this server already know about itself? */
  @Get('discover')
  async discover(): Promise<DiscoveryResult> {
    return this.orchestrator.discover();
  }

  /** Current installation status. */
  @Get('status')
  async getStatus() {
    return this.orchestrator.getStatus();
  }

  /** Dry-run validation — what would block configuration? */
  @Get('validate')
  async validate(@Query() dto: Partial<ConfigureInstallationDto>): Promise<{ validations: StepValidationIssue[] }> {
    const results = await this.orchestrator.validate(dto);
    return { validations: results };
  }

  /** Trigger configuration — returns operationId, progress via SSE. */
  @Post('configure')
  @HttpCode(HttpStatus.ACCEPTED)
  async configure(@Body() dto: ConfigureInstallationDto) {
    const { operationId } = await this.orchestrator.configure(dto);
    return { operationId };
  }

  /** SSE progress stream for an operation. */
  @Get('operations/:id/stream')
  async streamProgress(@Param('id') id: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const event of this.orchestrator.streamProgress(id)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (err) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err instanceof Error ? err.message : 'Unknown error' })}\n\n`);
    } finally {
      res.end();
    }
  }

  /**
   * Update Cloudflare OAuth credentials at the platform level.
   * Does NOT trigger full reconfiguration — only updates credentials.
   * Set clientId/clientSecret to null to disable OAuth.
   */
  @Patch('cloudflare-oauth')
  @HttpCode(HttpStatus.OK)
  async updateCloudflareOAuth(@Body() body: { clientId?: string; clientSecret?: string; enabled?: boolean }) {
    await this.orchestrator.updateCloudflareOAuth(body);
    return { success: true };
  }
}
