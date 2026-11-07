/**
 * ApiKeyOrJwtGuard — composite auth guard for BaaS-style endpoints.
 *
 * Accepts EITHER:
 *   1. A JWT Bearer token (Authorization: Bearer <jwt>) — resolved by the
 *      standard Passport JWT strategy (same as JwtAuthGuard).
 *   2. A project API key (X-API-Key: fpk_...) — validated via
 *      ProjectApiKeyService, which resolves the projectId and attaches it
 *      to req.user as { userId: 'api-key', projectId, apiKeyName }.
 *   3. An account API key (X-API-Key: fsk_...) — validated via
 *      AuthApiKeyService, which resolves the userId and attaches it
 *      to req.user as { userId, isApiKey: true, keyType: 'account',
 *      keyPermissions: [...] }.
 *
 * This lets external applications consume project-scoped services (storage,
 * databases, logs, etc.) with a single API key, while the dashboard still
 * authenticates via JWT. Apply to controllers that should accept both auth
 * methods — NOT to auth/account endpoints (those stay JWT-only).
 *
 * Usage: @UseGuards(ApiKeyOrJwtGuard) on a controller or method.
 */
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector, ModuleRef } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/modules/auth/decorators/public.decorator';
import { AccessTokenService } from '@/modules/auth/services/access-token.service';
import type { Request } from 'express';
import { ProjectApiKeyService } from '@/modules/projects/services/project-api-key.service';
import { AuthApiKeyService } from '@/modules/auth/services/auth-api-key.service';

export interface ApiKeyUser {
  userId: string;
  projectId?: string;
  apiKeyName?: string;
  isApiKey?: boolean;
  keyType?: 'account' | 'project';
  keyPermissions?: string[];
  /** The person's details, when the caller is a person. */
  email?: string;
  role?: string;
  sessionId?: string;
  emailVerifiedAt?: Date | null;
}

@Injectable()
export class ApiKeyOrJwtGuard {
  private readonly logger = new Logger(ApiKeyOrJwtGuard.name);

  constructor(
    private reflector: Reflector,
    private moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // A route that says it is public is public. The platform's
    // authorization is default-deny, and this guard used to be the one
    // exception — it asked for a caller whatever the route said.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Check for API key header first (X-API-Key: fpk_... or fsk_...)
    const apiKey = request.headers['x-api-key'] as string | undefined;
    if (apiKey) {
      const prefix = apiKey.slice(0, 4);

      // fpk_ — project API key
      if (prefix === 'fpk_') {
        const projectApiKeyService = this.moduleRef.get(ProjectApiKeyService, { strict: false });
        const result = await projectApiKeyService.validateProjectApiKey(apiKey);
        if (!result) {
          throw new UnauthorizedException('Invalid or expired API key');
        }
        (request as any).user = {
          userId: 'api-key',
          projectId: result.projectId,
          apiKeyName: result.name,
          isApiKey: true,
          keyType: 'project',
          // The key's own scopes, so `@RequireScope` is enforced for it.
          keyPermissions: result.permissions ?? [],
        } satisfies ApiKeyUser;
        return true;
      }

      // fsk_ — account API key
      if (prefix === 'fsk_') {
        const authApiKeyService = this.moduleRef.get(AuthApiKeyService, { strict: false });
        const result = await authApiKeyService.validateApiKey(apiKey);
        if (!result) {
          throw new UnauthorizedException('Invalid or expired Account API Key');
        }
        (request as any).user = {
          userId: result.userId,
          isApiKey: true,
          keyType: 'account',
          keyPermissions: result.permissions ?? [],
        } satisfies ApiKeyUser;
        return true;
      }

      // Unknown prefix — fall through to JWT
    }

    // Fall back to JWT Bearer token
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required (JWT or API key)');
    }

    const token = authHeader.slice(7);
    // The token is verified by the same service the session strategy uses:
    // its TYPE, its SESSION and its REVOCATION are all checked. It used to
    // be checked for its signature alone, which meant a **refresh token**
    // (seven days) presented as a bearer token authenticated as the user on
    // every route this guard covers — and survived logout, because the
    // logout tombstone is only consulted by the strategy.
    // The token is checked by the same service the session strategy uses.
    // It is looked up through the module reference rather than injected: this
    // guard is used by controllers in a dozen modules, and only some of them
    // import the auth module — a guard that cannot be constructed is a
    // platform that does not start.
    const accessTokens = this.moduleRef.get(AccessTokenService, { strict: false });
    const caller = await accessTokens.verify(token);
    (request as any).user = {
      userId: caller.userId,
      email: caller.email,
      role: caller.role,
      sessionId: caller.sessionId,
      emailVerifiedAt: caller.emailVerifiedAt,
      isApiKey: false,
    } satisfies ApiKeyUser;
    return true;
  }
}
