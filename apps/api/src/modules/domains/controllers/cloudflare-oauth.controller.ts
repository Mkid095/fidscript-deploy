import {
  Controller, Get, Post, Body, Param, UseGuards, Req,
  HttpCode, HttpStatus, UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { CloudflareOAuthService } from '@/modules/domains/services/cloudflare-oauth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Request } from 'express';
import * as crypto from 'crypto';

@ApiTags('cloudflare-oauth')
@Controller()
export class CloudflareOAuthController {
  constructor(
    private oauth: CloudflareOAuthService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get the Cloudflare OAuth authorization URL and a state parameter for CSRF protection.
   * Redirect the user to the returned URL to initiate the OAuth flow.
   */
  @Get('api/v1/projects/:projectId/domains/connect-cloudflare/oauth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Cloudflare OAuth authorization URL' })
  async getOAuthUrl(@Param('projectId') projectId: string, @Req() req: Request) {
    const state = crypto.randomBytes(16).toString('hex');
    const { url } = await this.oauth.buildAuthorizationUrl(state);
    return { url, state, projectId };
  }

  /**
   * Complete the Cloudflare OAuth flow.
   * Called by the dashboard after Cloudflare redirects back with ?code=...&state=...
   * This endpoint does NOT require JWT auth (Cloudflare redirects without it).
   */
  @Post('api/v1/domains/connect-cloudflare/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete Cloudflare OAuth — exchange code for token' })
  async completeOAuth(@Body() body: { code: string; state: string; projectId: string }, @Req() req: Request) {
    const user = (req as any).user as { userId: string } | undefined;
    const userId = user?.userId ?? 'system';

    const result = await this.oauth.completeOAuth(
      userId,
      body.projectId,
      body.code,
      body.state,
      body.state,
    );

    return {
      success: true,
      connection: {
        id: result.id,
        projectId: result.projectId,
        provider: result.provider,
        email: result.email,
        createdAt: result.createdAt.toISOString(),
      },
      message: 'Cloudflare connected successfully',
    };
  }

  /**
   * List Cloudflare zones accessible with the connected account.
   */
  @Get('api/v1/projects/:projectId/domains/connect-cloudflare/zones')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List Cloudflare zones accessible by the connected account' })
  async listZones(@Param('projectId') projectId: string) {
    const zones = await this.oauth.getAccessibleZones(projectId);
    return { zones };
  }

  /**
   * Test Cloudflare OAuth credentials before storing them.
   * Validates clientId/clientSecret by attempting a token exchange.
   */
  @Post('api/v1/installation/test-cloudflare-connection')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test Cloudflare OAuth credentials before saving' })
  async testConnection(@Body() body: { clientId: string; clientSecret: string }) {
    const result = await this.oauth.testConnection(body.clientId, body.clientSecret);
    return { valid: result.valid };
  }

  /**
   * Check whether Cloudflare OAuth is enabled at the platform level.
   * Used by the frontend to show/hide OAuth-dependent UI.
   */
  @Get('api/v1/installation/cloudflare-oauth-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if Cloudflare OAuth is enabled at platform level' })
  async getOAuthStatus() {
    let enabled = false;
    try {
      const settings = await this.prisma.installationSettings.findFirst() as any;
      enabled = !!(settings?.cloudflareOAuthEnabled &&
        settings?.encryptedCloudflareClientId &&
        settings?.encryptedCloudflareClientSecret);
    } catch { /* DB not ready */ }
    return { enabled };
  }
}
