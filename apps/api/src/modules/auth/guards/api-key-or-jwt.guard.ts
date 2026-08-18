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
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
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
}

@Injectable()
export class ApiKeyOrJwtGuard {
  private readonly logger = new Logger(ApiKeyOrJwtGuard.name);

  constructor(
    private jwtService: JwtService,
    private projectApiKeyService: ProjectApiKeyService,
    private authApiKeyService: AuthApiKeyService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Check for API key header first (X-API-Key: fpk_... or fsk_...)
    const apiKey = request.headers['x-api-key'] as string | undefined;
    if (apiKey) {
      const prefix = apiKey.slice(0, 4);

      // fpk_ — project API key
      if (prefix === 'fpk_') {
        const result = await this.projectApiKeyService.validateProjectApiKey(apiKey);
        if (!result) {
          throw new UnauthorizedException('Invalid or expired API key');
        }
        (request as any).user = {
          userId: 'api-key',
          projectId: result.projectId,
          apiKeyName: result.name,
          isApiKey: true,
          keyType: 'project',
        } satisfies ApiKeyUser;
        return true;
      }

      // fsk_ — account API key
      if (prefix === 'fsk_') {
        const result = await this.authApiKeyService.validateApiKey(apiKey);
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
    try {
      const payload = await this.jwtService.verifyAsync(token);
      (request as any).user = { userId: payload.sub ?? payload.userId, ...payload };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
