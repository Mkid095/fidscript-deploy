import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * The authenticated platform user attached by `JwtAuthGuard` / `JwtStrategy`.
 * Mirrors what `JwtStrategy.validate()` returns: `{ userId, email, role, sessionId }`.
 */
export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  /** Active session id (carried in the access JWT) — used by logout. */
  sessionId?: string;
}

/**
 * Inject the authenticated user into a controller handler.
 *
 * - `@CurrentUser() user: AuthUser`  → the whole user object
 * - `@CurrentUser('userId') id: string` → a single field
 *
 * Replaces ad-hoc `req.user as { userId: string }` casts scattered across
 * controllers with a single typed injection point.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    return (data ? user?.[data] : user) as AuthUser;
  },
);
