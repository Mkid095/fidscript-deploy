import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '@/modules/auth/decorators/public.decorator';
import { AccessTokenService } from '@/modules/auth/services/access-token.service';
import { ProjectApiKeyService } from '@/modules/projects/services/project-api-key.service';
import { AuthApiKeyService } from '@/modules/auth/services/auth-api-key.service';

/**
 * The platform's authorization is default-deny.
 *
 * A route is protected unless it says it is public, or unless it already
 * carries a guard of its own. Before this, a controller that forgot a guard
 * was **public** — and twelve controllers had none, among them the mail
 * webhooks, the Cloudflare OAuth callback and the installation routes.
 * Forgetting one line of code was a security hole.
 *
 * This guard runs before every controller action. It:
 *
 *  - lets a `@Public()` route through;
 *  - leaves a route that already declares a guard alone (that guard does
 *    its own, more specific, work — and re-authenticating here would cost
 *    a second database round trip on every request);
 *  - and otherwise requires a caller: a session token or an API key.
 */
@Injectable()
export class DefaultAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private accessTokens: AccessTokenService,
    private projectKeys: ProjectApiKeyService,
    private accountKeys: AuthApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // A route with a guard of its own is that guard's business.
    const declared = this.reflector.getAllAndOverride<unknown[]>(GUARDS_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (declared && declared.length > 0) return true;

    const request = context.switchToHttp().getRequest();

    const apiKey = request.headers?.['x-api-key'] as string | undefined;
    if (apiKey) {
      const prefix = apiKey.slice(0, 4);
      if (prefix === 'fpk_') {
        const result = await this.projectKeys.validateProjectApiKey(apiKey);
        if (!result) return false;
        request.user = {
          userId: 'api-key',
          projectId: result.projectId,
          apiKeyName: result.name,
          isApiKey: true,
          keyType: 'project',
          keyPermissions: result.permissions ?? [],
        };
        return true;
      }
      if (prefix === 'fsk_') {
        const result = await this.accountKeys.validateApiKey(apiKey);
        if (!result) return false;
        request.user = {
          userId: result.userId,
          isApiKey: true,
          keyType: 'account',
          keyPermissions: result.permissions ?? [],
        };
        return true;
      }
      return false;
    }

    const authHeader = request.headers?.authorization as string | undefined;
    if (!authHeader?.startsWith('Bearer ')) return false;

    const caller = await this.accessTokens.verify(authHeader.slice(7));
    request.user = {
      userId: caller.userId,
      email: caller.email,
      role: caller.role,
      sessionId: caller.sessionId,
      emailVerifiedAt: caller.emailVerifiedAt,
      isApiKey: false,
    };
    return true;
  }
}
