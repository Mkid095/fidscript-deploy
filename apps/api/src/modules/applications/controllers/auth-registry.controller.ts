import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ScopeGuard } from '@/modules/auth/guards/scope-guard';
import { RequireScope } from '@/modules/auth/decorators/require-scope.decorator';
import { RegistryAccountService } from '../services/registry-account.service';

type RegistryUser = { userId: string };

/**
 * The user's registry account, linked to the platform.
 *
 * One login, two systems: the platform mints the registry account for the
 * user, keeps the password, and hands the token to the user's machine.
 * `fidscript login` and `fidscript registry link` call these routes; the
 * dashboard's token screen shows the link and can break it.
 *
 * The caller is a person, or a key acting as one: an account key passes the
 * user id it belongs to, and a project key has no user, so it cannot link.
 */
@ApiTags('registry-account')
@Controller('auth/registry')
@UseGuards(ApiKeyOrJwtGuard, ScopeGuard)
@ApiBearerAuth()
export class AuthRegistryController {
  constructor(private registryAccount: RegistryAccountService) {}

  @Get()
  @RequireScope('registry:read')
  @ApiOperation({ summary: 'Whether this user has a linked registry account' })
  async status(@Req() req: Request) {
    const user = req.user as RegistryUser;
    if (!user.userId || user.userId === 'api-key') {
      return { linked: false };
    }
    return this.registryAccount.status(user.userId);
  }

  @Post('link')
  @RequireScope('registry:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Link this user’s registry account; the token is returned once' })
  async link(@Req() req: Request) {
    const user = req.user as RegistryUser;
    if (!user.userId || user.userId === 'api-key') {
      // A project key acts as a project, not as a person — it has no
      // registry account to link.
      throw new ForbiddenException(
        'A project key cannot link a registry account',
      );
    }
    return this.registryAccount.link(user.userId);
  }

  @Delete()
  @RequireScope('registry:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Forget the linked registry account' })
  async unlink(@Req() req: Request) {
    const user = req.user as RegistryUser;
    if (!user.userId || user.userId === 'api-key') {
      throw new ForbiddenException(
        'A project key cannot unlink a registry account',
      );
    }
    return this.registryAccount.unlink(user.userId);
  }
}
