import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthController } from '@/modules/auth/controllers/auth.controller';

/**
 * Metadata key for opting a route out of the global `EmailVerifiedGuard`.
 *
 * Apply via `@SkipEmailVerification()` on a handler or controller. Currently
 * the entire `AuthController` is exempted by class match, so individual
 * handlers don't need this — but it's exposed for any future third-party
 * controller that has legitimate pre-verification endpoints.
 */
export const SKIP_EMAIL_VERIFICATION = Symbol('SKIP_EMAIL_VERIFICATION');
export const SkipEmailVerification = (): MethodDecorator & ClassDecorator => {
  return (target: object, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(SKIP_EMAIL_VERIFICATION, true, descriptor.value);
    } else {
      Reflect.defineMetadata(SKIP_EMAIL_VERIFICATION, true, target);
    }
  };
};

/**
 * Guard that blocks authenticated access for users whose email is not yet
 * verified.
 *
 * Registered as a global guard so we don't have to thread
 * `@UseGuards(EmailVerifiedGuard)` through every controller. The only
 * exemption is the `AuthController` itself — every endpoint there is part
 * of the verification/recovery flow (verify email, send verification,
 * change password, logout, etc.) and must remain reachable even before
 * the user is verified.
 *
 * Public (unauthenticated) routes are unaffected — the guard short-circuits
 * when `req.user` is absent, leaving authorization to whatever guards
 * those routes already use.
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { emailVerifiedAt?: Date | null } | undefined;

    // Public routes (no auth attached) — let downstream guards decide.
    if (!user) {
      return true;
    }

    // Explicit skip via decorator — wins over the controller match.
    const skipOnHandler = this.reflector.get<boolean>(
      SKIP_EMAIL_VERIFICATION,
      context.getHandler(),
    );
    const skipOnClass = this.reflector.get<boolean>(
      SKIP_EMAIL_VERIFICATION,
      context.getClass(),
    );
    if (skipOnHandler || skipOnClass) {
      return true;
    }

    // The AuthController is the only place pre-verification traffic is
    // legitimate — verify/send/logout/change-password/me must all work
    // even when the user is not yet verified.
    if (context.getClass() === AuthController) {
      return true;
    }

    // Strict check — null/undefined means unverified.
    if (user.emailVerifiedAt == null) {
      throw new ForbiddenException(
        'Please verify your email before accessing this resource',
      );
    }

    return true;
  }
}
