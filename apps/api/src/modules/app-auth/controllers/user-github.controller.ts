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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '@/modules/auth/current-user.decorator';
import { UserGithubService } from '../services/user-github.service';

@ApiTags('github')
@Controller('users/me/github')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserGithubController {
  constructor(private readonly githubService: UserGithubService) {}

  @Get('connect')
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: 'Redirect to GitHub OAuth authorize URL' })
  async connect(
    @CurrentUser() user: AuthUser,
    @Query('redirect') redirectAfterUrl?: string,
  ) {
    const { url } = await this.githubService.buildAuthorizeUrl(user.userId, redirectAfterUrl);
    return { url };
  }

  @Get('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle GitHub OAuth callback — stores token, returns connection info' })
  async callback(
    @CurrentUser() user: AuthUser,
    @Query('code') code: string,
    @Query('state') state?: string,
  ) {
    if (!code) throw new NotFoundException('Missing code parameter');
    return this.githubService.handleCallback(user.userId, code, state);
  }

  @Get('status')
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove the GitHub connection for this user' })
  async disconnect(@CurrentUser() user: AuthUser) {
    await this.githubService.disconnect(user.userId);
    return { success: true };
  }

  @Get('repos')
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
  @ApiOperation({ summary: 'List branches for a GitHub repository' })
  async listBranches(
    @CurrentUser() user: AuthUser,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
  ) {
    return this.githubService.listBranches(user.userId, `${owner}/${repo}`);
  }
}
