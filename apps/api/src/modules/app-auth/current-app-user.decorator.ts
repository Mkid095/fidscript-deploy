import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AppAuthUser } from './jwt/app-jwt.strategy';

/**
 * Resolves the authenticated app-user from request.user (set by AppJwtGuard via Passport).
 * Use on routes protected by @UseGuards(AppJwtGuard).
 */
export const CurrentAppUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AppAuthUser => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AppAuthUser }>();
    if (!req.user) {
      throw new Error('CurrentAppUser used on a route without AppJwtGuard');
    }
    return req.user;
  },
);