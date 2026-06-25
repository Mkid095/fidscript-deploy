import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Res,
  Req,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '@/modules/auth/current-user.decorator';
import { UserGithubService } from '../services/user-github.service';

@ApiTags('github')
@Controller('users/me/github')
export class UserGithubController {
  constructor(private readonly githubService: UserGithubService) {}

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
  @ApiOperation({ summary: 'GitHub OAuth callback — closes popup via postMessage' })
  async callback(@Req() req: Request, @Res() res: Response) {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const error = req.query.error as string | undefined;
    const errorDescription = req.query.error_description as string | undefined;

    const html = `<!DOCTYPE html><html><body><script>
      try {
        window.opener.postMessage({
          type: 'github-oauth-callback'${code ? `, code: '${code}'` : ''}${error ? `, error: '${error}', errorDescription: '${errorDescription || ''}'` : ''}${state ? `, state: '${state}'` : ''}
        }, '*');
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
    if (!body.code) throw new NotFoundException('Missing code parameter');
    const result = await this.githubService.handleCallback(body.code, body.state ?? '');
    return result;
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the current GitHub connection status for this user' })
  async status(@CurrentUser() user: AuthUser) {
    const conn = await this.githubService.getConnection(user.userId);
    if (!conn) return { connected: false };
    return {
      connected: true,
      username: conn.username,
      avatarUrl: conn.avatarUrl,
      scopes: conn.scopes,
    };
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove the GitHub connection for this user' })
  async disconnect(@CurrentUser() user: AuthUser) {
    await this.githubService.disconnect(user.userId);
    return { success: true };
  }

  @Get('repos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the authenticated user's GitHub repositories" })
  async listRepos(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.githubService.listRepos(
      user.userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 30,
    );
  }

  @Get('repos/:owner/:repo/branches')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List branches for a GitHub repository' })
  async listBranches(
    @CurrentUser() user: AuthUser,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
  ) {
    return this.githubService.listBranches(user.userId, `${owner}/${repo}`);
  }
}
