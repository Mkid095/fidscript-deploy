import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AppAuthRegisterService } from './app-auth-register.service';
import { AppAuthLoginService } from './app-auth-login.service';

@Injectable()
export class AppAuthUserService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private registerService: AppAuthRegisterService,
    private loginService: AppAuthLoginService,
  ) {}

  register(projectId: string, dto: any) { return this.registerService.register(projectId, dto); }
  login(projectId: string, dto: any) { return this.loginService.login(projectId, dto); }
  magicLink(projectId: string, dto: any) { return this.loginService.magicLink(projectId, dto); }
  verifyMagicLink(projectId: string, dto: any) { return this.loginService.verifyMagicLink(projectId, dto); }
  logout(sessionId: string) { return this.loginService.logout(sessionId); }

  async validateToken(token: string) {
    const sessions = await this.prisma.appSession.findMany({ where: { expiresAt: { gt: new Date() } } });
    for (const session of sessions) {
      const { compare } = await import('bcrypt');
      if (await compare(token, session.tokenHash)) {
        const user = await this.prisma.appUser.findUnique({
          where: { id: session.userId },
          include: { roles: { include: { role: true } } },
        });
        if (user) {
          return {
            userId: user.id,
            projectId: user.projectId,
            email: user.email,
            permissions: user.roles.flatMap(r => r.role.permissions as string[]),
          };
        }
      }
    }
    return null;
  }
}
