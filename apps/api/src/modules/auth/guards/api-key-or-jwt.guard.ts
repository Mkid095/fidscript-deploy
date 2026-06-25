/**
 * ApiKeyOrJwtGuard — composite auth guard for BaaS-style endpoints.
 *
 * Accepts EITHER:
 *   1. A JWT Bearer token (Authorization: Bearer <jwt>) — resolved by the
 *      standard Passport JWT strategy (same as JwtAuthGuard).
 *   2. A project API key (X-API-Key: fpk_...) — validated via
 *      ProjectApiKeyService, which resolves the projectId and attaches it
 *      to req.user as { userId: 'api-key', projectId, apiKeyName }.
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

export interface ApiKeyUser {
  userId: string;
  projectId?: string;
  apiKeyName?: string;
  isApiKey?: boolean;
}

@Injectable()
export class ApiKeyOrJwtGuard {
  private readonly logger = new Logger(ApiKeyOrJwtGuard.name);

  constructor(
    private jwtService: JwtService,
    private apiKeyService: ProjectApiKeyService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Check for API key header first (X-API-Key: fpk_...)
    const apiKey = request.headers['x-api-key'] as string | undefined;
    if (apiKey) {
      const result = await this.apiKeyService.validateProjectApiKey(apiKey);
      if (!result) {
        throw new UnauthorizedException('Invalid or expired API key');
      }
      // Attach the resolved identity to the request
      (request as any).user = {
        userId: 'api-key',
        projectId: result.projectId,
        apiKeyName: result.name,
        isApiKey: true,
      } satisfies ApiKeyUser;
      return true;
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
