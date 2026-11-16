import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '@prisma/client';

import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { PlatformAdminGuard } from '@/modules/auth/guards/platform-admin.guard';
import { Roles } from '@/modules/auth/guards/roles.decorator';
import { PlatformCredentialsService } from '../services/platform-credentials.service';

/**
 * The credentials of the applications the platform runs.
 *
 * Where the operator decides "one email, one password" instead of
 * discovering what each application happens to answer with (P5.4). Platform
 * admins only: every answer here is a credential.
 */
@ApiTags('admin-platform-credentials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Roles(Role.ADMIN, Role.OWNER)
@Controller('admin/platform-credentials')
export class PlatformCredentialsController {
  constructor(private credentials: PlatformCredentialsService) {}

  /** What each application answers with, as it is configured now. */
  @Get()
  @ApiOperation({ summary: 'The account each application answers with' })
  async list() {
    return this.credentials.list();
  }

  /** Does that password open each application? Asked live. */
  @Post('verify')
  @ApiOperation({
    summary: 'Check a candidate email and password against every application',
  })
  async verify(
    @Req() req: Request,
    @Body() body: { email?: string; password?: string },
  ) {
    const user = req.user as { userId: string };
    const email = (body.email ?? '').trim();
    const password = body.password ?? '';
    return this.credentials.verify(user.userId, email, password);
  }

  /** Push the platform's identity onto the applications that take it. */
  @Post('apply')
  @ApiOperation({
    summary: 'Apply the platform email and password to the applications',
  })
  async apply(
    @Req() req: Request,
    @Body() body: { email?: string; password?: string },
  ) {
    const user = req.user as { userId: string };
    const email = (body.email ?? '').trim();
    const password = body.password ?? '';
    return this.credentials.apply(user.userId, email, password);
  }
}
