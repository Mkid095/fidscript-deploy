import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Enforces that an fsk_ account key cannot mint an fpk_ project key with
 * permissions greater than its own granted scopes.
 *
 * Applied ONLY to POST /projects/:id/api-keys.
 * - JWT callers: membership check is handled by ProjectMemberGuard.
 * - fpk_ callers: ProjectMemberGuard already ran; this guard is a no-op.
 * - fsk_ callers: verifies the requested fpk_ permissions are a subset of
 *   the caller's own keyPermissions.
 */
@Injectable()
export class ProjectApiKeyMintGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Only enforce for fsk_ (account) API key callers
    if (!user?.isApiKey || user.keyType !== 'account') return true;

    const callerPerms: string[] = user.keyPermissions ?? [];
    const requestedPerms: string[] = request.body?.permissions ?? [];

    // An empty scope list means "no scope restriction" — which is only
    // something a caller with no scope restriction of its own may hand out.
    // Otherwise an account key holding `projects:read` could mint a key with
    // every scope, and escalate itself.
    if (requestedPerms.length === 0) {
      if (callerPerms.length > 0) {
        throw new ForbiddenException(
          'An account API key with scopes cannot mint a key without scope restrictions',
        );
      }
      return true;
    }

    const denied = requestedPerms.filter(p => !callerPerms.includes(p));
    if (denied.length > 0) {
      throw new ForbiddenException(
        `Account API key cannot grant scopes it does not have: ${denied.join(', ')}`,
      );
    }
    return true;
  }
}
