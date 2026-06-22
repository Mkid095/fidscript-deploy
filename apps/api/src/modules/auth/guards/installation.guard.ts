import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InstallationOrchestratorService } from '@/modules/installation/installation.service';

/**
 * Guard that blocks auth endpoints once the platform is lifecycle=CONFIGURED.
 *
 * Before the platform is configured (UNCONFIGURED / CONFIGURING), the only
 * valid auth flow is the /setup wizard — any direct login or register
 * attempt is rejected so the lifecycle cannot be bypassed.
 *
 * After configuration (CONFIGURED), this guard passes through so the normal
 * JwtAuthGuard / roles guards handle authorization.
 */
@Injectable()
export class InstallationGuard implements CanActivate {
  constructor(private readonly installation: InstallationOrchestratorService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const status = await this.installation.getStatus();

    if (status.lifecycle !== 'CONFIGURED') {
      // Platform not yet configured — only the setup wizard is allowed
      throw new ForbiddenException(
        'Platform is not yet configured. Please complete the setup wizard.',
      );
    }

    return true;
  }
}
