import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AppAuthRegisterService } from './app-auth-register.service';
import { AppAuthLoginService } from './app-auth-login.service';
import { MagicCodeService } from './magic-code.service';
import { AppAuthTokenService } from './app-auth-token.service';

@Injectable()
export class AppAuthUserService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private registerService: AppAuthRegisterService,
    private loginService: AppAuthLoginService,
    private magicCodeService: MagicCodeService,
    private tokenService: AppAuthTokenService,
  ) {}

  register(projectId: string, dto: any) { return this.registerService.register(projectId, dto); }
  login(projectId: string, dto: any, ipAddress?: string, userAgent?: string) {
    return this.loginService.login(projectId, dto, this.tokenService, ipAddress, userAgent);
  }
  magicLink(projectId: string, dto: any) { return this.loginService.magicLink(projectId, dto); }
  verifyMagicLink(projectId: string, dto: any, ipAddress?: string, userAgent?: string) {
    return this.loginService.verifyMagicLink(projectId, dto, this.tokenService, ipAddress, userAgent);
  }
  requestCode(projectId: string, email: string, ipAddress?: string) { return this.magicCodeService.requestCode(projectId, email, ipAddress); }
  verifyCode(projectId: string, email: string, code: string, ipAddress?: string) { return this.magicCodeService.verifyCode(projectId, email, code, ipAddress, this.tokenService); }
  logout(sessionId: string) { return this.tokenService.revokeSession(sessionId); }
}