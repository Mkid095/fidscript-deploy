import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AuthRateLimiter } from '@/common/auth-rate-limiter.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const BCRYPT_ROUNDS = 12;
// Login brute-force protection (Phase 03 gap): Redis-backed fixed-window limits.
const LOGIN_IP_LIMIT = 30; // max attempts per IP within the window
const LOGIN_ACCT_LIMIT = 5; // max failed attempts per account within the window
const LOGIN_WINDOW_SEC = 15 * 60;

@Injectable()
export class AuthLoginService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private rateLimiter: AuthRateLimiter,
  ) {}

  async login(dto: { email: string; password: string }, ipAddress?: string, userAgent?: string) {
    // Rate limiting (Phase 03 gap): per-IP attempt cap + per-account failure lockout.
    const acctKey = `rl:login:fail:${dto.email.toLowerCase()}`;
    if (ipAddress) {
      const ipRl = await this.rateLimiter.consume(
        `rl:login:ip:${ipAddress}`, LOGIN_IP_LIMIT, LOGIN_WINDOW_SEC,
      );
      if (!ipRl.allowed) {
        throw new HttpException('Too many login attempts from this address. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
      }
    }
    if ((await this.rateLimiter.count(acctKey)) >= LOGIN_ACCT_LIMIT) {
      throw new HttpException('Account temporarily locked after repeated failures. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !user.passwordHash) {
      await this.rateLimiter.consume(acctKey, LOGIN_ACCT_LIMIT, LOGIN_WINDOW_SEC);
      await this.eventService.emit(
        'identity.user.login_failed',
        { email: dto.email, reason: 'user_not_found' },
        { actorType: 'user', resourceType: 'user', resourceId: 'unknown', ipAddress, userAgent },
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.rateLimiter.consume(acctKey, LOGIN_ACCT_LIMIT, LOGIN_WINDOW_SEC);
      await this.eventService.emit(
        'identity.user.login_failed',
        { email: user.email, reason: 'invalid_password' },
        { actorId: user.id, actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    await this.eventService.emit(
      'identity.user.logged_in',
      { email: user.email },
      { actorId: user.id, actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
    );

    return user;
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: new Date(0) },
    }).catch(() => {});

    await this.eventService.emit(
      'identity.user.logged_out',
      {},
      { actorId: userId, actorType: 'user', resourceType: 'session', resourceId: sessionId },
    );
  }
}
