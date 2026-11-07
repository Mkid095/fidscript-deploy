import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Res,
  Req,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '@/modules/auth/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import { UserGithubService } from '../services/user-github.service';
import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('github')
@Controller('users/me/github')
export class UserGithubController {
  /** Where the message goes — the dashboard's origin, not '*'. */
  private readonly dashboardOrigin: string;

  constructor(
    private readonly githubService: UserGithubService,
    configService: ConfigService,
  ) {
    const domain = configService.get<string>('PLATFORM_DOMAIN') ?? '';
    this.dashboardOrigin =
      configService.get<string>('DASHBOARD_PUBLIC_URL') ??
      (domain ? `https://${domain}` : 'http://localhost:3000');
  }

  /**
   * GET /users/me/github/connect
   *
   * Returns the GitHub OAuth URL in the X-GitHub-OAuth-Url response header (HTTP 200).
   * The frontend opens this URL in a popup window so the user's dashboard session
   * is preserved while GitHub authorization runs in the popup.
   *
   * Authenticated endpoint (requires JWT) — the dashboard is already logged in.
   */
  @Get('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return GitHub OAuth authorize URL (open in popup)' })
  async connect(
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
    @Query('redirect') redirectAfterUrl?: string,
  ) {
    const { url } = await this.githubService.buildAuthorizeUrl(user.userId, redirectAfterUrl);
    res.setHeader('X-GitHub-OAuth-Url', url);
    return res.status(200).json({ url });
  }

  /**
   * GET /users/me/github/callback
   *
   * GitHub redirects here after the user approves/denies access.
   * This endpoint is NOT behind the JWT guard — GitHub doesn't know our JWT.
   * It renders a minimal HTML page that:
   *   1. Sends the code/error to the opener via postMessage
   *   2. Closes the popup window
   *
   * The frontend (opener) then makes POST /exchange to complete the flow server-side.
   */
  @Get('callback')
  @Public()
  @ApiOperation({ summary: 'GitHub OAuth callback — closes popup via postMessage' })
  async callback(@Req() req: Request, @Res() res: Response) {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const error = req.query.error as string | undefined;
    const errorDescription = req.query.error_description as string | undefined;

    // The payload is JSON, not string concatenation. It used to be built by
    // pasting the query values into a JavaScript object literal — so a crafted
    // `error_description` could break out of the string and run. And the
    // message was posted to '*', which hands the OAuth code to whatever
    // origin the opener happens to be.
    const payload = JSON.stringify({
      type: 'github-oauth-callback',
      ...(code ? { code } : {}),
      ...(error ? { error, errorDescription: errorDescription ?? '' } : {}),
      ...(state ? { state } : {}),
    }).replace(/</g, '\\u003c');

    const html = `<!DOCTYPE html><html><body><script>
      try {
        window.opener.postMessage(${payload}, ${JSON.stringify(this.dashboardOrigin)});
      } catch(e) {}
      setTimeout(() => window.close(), 500);
    </script><p style="font-family:sans-serif;font-size:14px;color:#666;padding:20px">
      ${error ? 'GitHub authorization failed. You can close this window.' : 'Authorization complete! This window will close automatically.'}
    </p></body></html>`;

    return res
      .header('Content-Type', 'text/html; charset=utf-8')
      .status(200)
      .send(html);
  }

  /**
   * POST /users/me/github/exchange
   *
   * Called by the frontend after the popup closes — exchanges the GitHub code
   * for a stored connection. Completes the OAuth flow server-side.
   */
  @Post('exchange')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange GitHub OAuth code for a connection (called after popup closes)' })
  async exchange(
    @CurrentUser() user: AuthUser,
    @Body() body: { code?: string; state?: string },
  ) {
    if (!body.code) throw new BadRequestException('Missing code parameter');
    return this.githubService.handleCallback(body.code, body.state ?? '');
  }

  /**
   * POST /users/me/github/token
   *
   * Connects the account with a GitHub personal access token.
   *
   * The OAuth popup needs a GitHub OAuth app, and a deployment does not
   * always have one. A personal access token gets the same access without it:
   * the token is checked against GitHub, stored encrypted, and used for the
   * same repository and clone operations. The token is never returned.
   */
  @Post('token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connect a GitHub account with a personal access token' })
  async connectWithToken(
    @CurrentUser() user: AuthUser,
    @Body() body: { token?: string },
  ) {
    return this.githubService.connectWithToken(user.userId, body?.token ?? '');
  }
}
