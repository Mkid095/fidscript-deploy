import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from '../decorators/require-scope.decorator';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required: string[] = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [];
    if (!required.length) return true;

    const user = context.switchToHttp().getRequest().user;
    // Only enforce scopes for API key callers (fsk_ / fpk_).
    // JWT callers proceed through existing authorization.
    if (!user?.isApiKey || !Array.isArray(user.keyPermissions)) return true;

    const missing = required.filter(s => !user.keyPermissions.includes(s));
    if (missing.length > 0) {
      throw new ForbiddenException(`Missing required scope(s): ${missing.join(', ')}`);
    }
    return true;
  }
}
