import { Controller, Get, Post, Body, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { PlatformAdminGuard, ROLES_KEY } from '@/modules/auth/guards/platform-admin.guard';
import { AuthSetupPasswordService } from '@/modules/auth/services/auth-setup-password.service';
import { SetupPasswordDto } from '@/modules/auth/dto/setup-password.dto';

/**
 * The company password, set and rotated by the operator.
 *
 * The setup form sets it on a fresh install; this route is how the same
 * person changes it afterwards. Only a platform owner or admin may.
 */
@ApiTags('auth')
@Controller('auth/setup-password')
@UseGuards(ApiKeyOrJwtGuard)
@ApiBearerAuth()
export class AuthSetupPasswordController {
  constructor(private readonly setupPassword: AuthSetupPasswordService) {}

  @Get()
  @UseGuards(PlatformAdminGuard)
  @SetMetadata(ROLES_KEY, ['ADMIN', 'OWNER'])
  @ApiOperation({ summary: 'Whether a company password is set (never the password itself)' })
  async status() {
    return { configured: await this.setupPassword.isConfigured() };
  }

  @Post()
  @UseGuards(PlatformAdminGuard)
  @SetMetadata(ROLES_KEY, ['ADMIN', 'OWNER'])
  @ApiOperation({ summary: 'Set or rotate the company password that gates registration' })
  async set(@Body() dto: SetupPasswordDto) {
    await this.setupPassword.set(dto.setupPassword);
    return { configured: true };
  }
}
