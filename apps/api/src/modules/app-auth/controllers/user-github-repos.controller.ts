import { Controller, Get, Delete, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '@/modules/auth/current-user.decorator';
import { UserGithubService } from '../services/user-github.service';

/**
 * The connected GitHub account: what it is, whether it is there, and the
 * repositories it can reach.
 *
 * Separate from the sign-in controller, because reading the account is a
 * different thing from changing who is connected.
 */
@ApiTags('github')
@Controller('users/me/github')
export class UserGithubReposController {
  constructor(private readonly githubService: UserGithubService) {}

  /**
   * GET /users/me/github/oauth
   *
   * Whether the deployment has a GitHub OAuth app. The dashboard uses this to
   * offer the right way to connect, instead of opening a popup that cannot
   * work.
   */
  @Get('oauth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Whether GitHub OAuth sign-in is configured on this deployment' })
  oauthStatus() {
    return { configured: this.githubService.isOAuthConfigured() };
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
