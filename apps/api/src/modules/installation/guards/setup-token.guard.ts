import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { existsSync, readFileSync } from 'fs';
import { timingSafeEqual } from 'crypto';

/**
 * The setup routes are the only routes on the platform that may be used
 * before anyone has an account — so they are also the only routes that can
 * be used by **anyone**.
 *
 * `POST /installation/configure` writes the platform's domain, its routing,
 * its DNS credentials, its company password and its administrator. It had no
 * guard at all: an anonymous caller could configure the platform, set the
 * company password that gates registration, and create the administrator
 * account with a password of their choosing.
 *
 * Two rules now stand in front of it:
 *
 *  1. **A configured platform has no setup.** Once the lifecycle says
 *     CONFIGURED, the setup routes are closed — a re-configuration is an
 *     authenticated operator's act, through the settings.
 *  2. **Before that, the caller must present the setup token.** The
 *     installer generates it, prints it once, and the operator types it
 *     into the setup page. Nobody else has it.
 */
@Injectable()
export class SetupTokenGuard implements CanActivate {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // A platform that is already installed does not have a setup phase.
    const status = await this.prisma.installationStatus.findFirst({
      select: { lifecycle: true },
    });
    const lifecycle = status?.lifecycle ?? 'UNCONFIGURED';
    if (lifecycle === 'CONFIGURED') {
      throw new ForbiddenException('This platform is already configured');
    }

    const expected = this.readToken();
    if (!expected) {
      // No token file: the setup cannot be done safely. Fail closed.
      throw new ForbiddenException(
        'This platform has no setup token — the setup routes are closed',
      );
    }

    const presented = String(request.headers['x-setup-token'] ?? '');
    const a = Buffer.from(presented);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid setup token');
    }

    return true;
  }

  /** The token the installer generated, or an empty string when there is none. */
  private readToken(): string {
    const file = this.config.get<string>(
      'SETUP_TOKEN_FILE',
      '/run/secrets/fidscript_setup_token.txt',
    );
    try {
      if (!existsSync(file)) return '';
      return readFileSync(file, 'utf8').trim();
    } catch {
      return '';
    }
  }
}
