import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MagicCodeService } from '@/modules/app-auth/services/magic-code.service';
import { AppAuthTokenService } from '@/modules/app-auth/services/app-auth-token.service';
import { AppAuthUserService } from '@/modules/app-auth/services/app-auth-user.service';
import { AppJwtGuard } from '@/modules/app-auth/jwt/app-jwt.guard';
import { AppAuthManagementService } from '@/modules/app-auth/services/app-auth-management.service';
import { extractRequestContext } from '@/common/request-context';
import { Request } from 'express';

/** WhatsApp Console uses a single fixed project for all WhatsApp clients. */
const WHATSAPP_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

class RequestCodeDto {
  email!: string;
  name?: string;
  phone?: string;
}

class VerifyCodeDto {
  email!: string;
  code!: string;
  name?: string;
  phone?: string;
}

/**
 * Bridge controller that exposes WhatsApp Console-compatible auth routes
 * on top of the existing platform magic-code infrastructure.
 *
 * Maps:
 *   POST /api/auth/request-code  → MagicCodeService.requestCode (project-scoped)
 *   POST /api/auth/verify-code  → MagicCodeService.verifyCode  (project-scoped)
 *   GET  /api/auth/me           → AppJwtGuard + AppAuthManagementService
 */
@ApiTags('whatsapp-auth')
@Controller('api/auth')
export class WhatsappAuthController {
  constructor(
    private magicCodeService: MagicCodeService,
    private tokenService: AppAuthTokenService,
    private userService: AppAuthUserService,
    private managementService: AppAuthManagementService,
  ) {}

  @Post('request-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request magic code for WhatsApp Console login' })
  async requestCode(@Body() dto: RequestCodeDto, @Req() req: Request) {
    const { ipAddress } = extractRequestContext(req);
    await this.magicCodeService.requestCode(WHATSAPP_PROJECT_ID, dto.email, ipAddress);
    return { success: true, data: { message: 'Verification code sent to your email.' } };
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify magic code and return session token' })
  async verifyCode(@Body() dto: VerifyCodeDto, @Req() req: Request) {
    const { ipAddress } = extractRequestContext(req);
    const result = await this.magicCodeService.verifyCode(
      WHATSAPP_PROJECT_ID,
      dto.email,
      dto.code,
      ipAddress,
      this.tokenService,
    );
    // Adapt MagicCodeResult → WhatsApp Console expected shape { token, role, user }
    return {
      success: true,
      data: {
        token: result.accessToken ?? result.token,
        role: 'client',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
      },
    };
  }

  @Get('me')
  @UseGuards(AppJwtGuard)
  @ApiOperation({ summary: 'Return the current authenticated WhatsApp user' })
  async me(@Req() req: Request) {
    // AppJwtGuard populated req.user via JWT verification
    const user = (req as any).user;
    if (!user?.appUserId) throw new UnauthorizedException();
    return {
      success: true,
      data: {
        id: user.appUserId,
        email: user.email,
        name: user.name,
        role: 'client',
      },
    };
  }
}
