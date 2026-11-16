import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthSessionService } from '@/modules/auth/services/auth-session.service';
import { AuthRegisterService } from '@/modules/auth/services/auth-register.service';
import { AuthLoginService } from '@/modules/auth/services/auth-login.service';
import { AuthTokenService } from '@/modules/auth/services/auth-token.service';
import { AuthProfileService } from '@/modules/auth/services/auth-profile.service';
import { AuthSessionMgmtService } from '@/modules/auth/services/auth-session-mgmt.service';
import { AuthApiKeyService } from '@/modules/auth/services/auth-api-key.service';
import { AuthPasswordService } from '@/modules/auth/services/auth-password.service';
import { AuthMagicCodeService } from '@/modules/auth/services/auth-magic-code.service';
import { AuthMagicCodeVerifyService } from '@/modules/auth/services/auth-magic-code-verify.service';
import { AuthVerificationService } from '@/modules/auth/services/auth-verification.service';

export {
  AuthSessionService,
  AuthResponse,
} from '@/modules/auth/services/auth-session.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private session: AuthSessionService,
    private authRegister: AuthRegisterService,
    private authLogin: AuthLoginService,
    private authToken: AuthTokenService,
    private profile: AuthProfileService,
    private sessions: AuthSessionMgmtService,
    private apiKeys: AuthApiKeyService,
    private password: AuthPasswordService,
    private magicCodeService: AuthMagicCodeService,
    private magicCodeVerify: AuthMagicCodeVerifyService,
    private verification: AuthVerificationService,
  ) {}

  async register(dto: any, ip?: string, ua?: string) {
    const user = await this.authRegister.register(dto, ip, ua);
    // Auto-provision a default Organization + Project so the dashboard is
    // never empty on first login. Failures are swallowed inside the onboarding
    // service; we still ship the auth tokens so the user can sign in and try
    // provisioning manually (or a background job can reconcile later).
    const onboarding = await this.authRegister.provisionForNewUser(
      user.id,
      user.email,
    );
    const sess = await this.session.createSession(user.id, ip, ua);
    const response = this.session.buildAuthResponse(user, sess);
    return {
      ...response,
      onboarding: onboarding ?? null,
    };
  }

  async login(dto: any, ip?: string, ua?: string) {
    const result = await this.authLogin.login(dto, ip, ua);
    if (result.mfaToken)
      return { mfaRequired: true, mfaToken: result.mfaToken };
    const sess = await this.session.createSession(result.user.id, ip, ua);
    return this.session.buildAuthResponse(result.user, sess);
  }

  logout(sessionId: string, userId: string) {
    return this.authLogin.logout(sessionId, userId);
  }

  changePassword(
    userId: string,
    sessionId: string | undefined,
    dto: { currentPassword: string; newPassword: string },
    ip?: string,
    ua?: string,
  ) {
    return this.password.changePassword(userId, sessionId, dto, ip, ua);
  }

  magicCode(dto: { email: string }, ip?: string, ua?: string) {
    return this.magicCodeService.requestCode(dto, ip, ua);
  }

  verifyMagicCode(
    dto: { email: string; code: string },
    ip?: string,
    ua?: string,
  ) {
    return this.magicCodeVerify.verifyCode(dto, ip, ua);
  }

  async refreshToken(token: string) {
    const { user, oldSession } = await this.authToken.refreshToken(token);
    const sess = await this.session.createSession(
      user.id,
      oldSession?.ipAddress ?? undefined,
    );
    return this.session.buildAuthResponse(user, sess);
  }

  createSession(userId: string, ip?: string, ua?: string) {
    return this.session.createSession(userId, ip, ua);
  }
  buildAuthResponse(user: any, session: any) {
    return this.session.buildAuthResponse(user, session);
  }

  getProfile(userId: string) {
    return this.profile.getProfile(userId);
  }

  /**
   * Marks the first-time journey as finished.
   *
   * The flag is what lets the dashboard OFFER the journey rather than force
   * it: an account that has already finished it — or that already has
   * projects — is never made to go through it again.
   */
  async completeOnboarding(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardedAt: new Date() },
    });
    return { onboarded: true };
  }
  updateProfile(userId: string, dto: any) {
    return this.profile.updateProfile(userId, dto);
  }

  getSessions(userId: string) {
    return this.sessions.getSessions(userId);
  }
  revokeSession(userId: string, sessionId: string) {
    return this.sessions.revokeSession(userId, sessionId);
  }
  revokeAllSessions(userId: string) {
    return this.sessions.revokeAllSessions(userId);
  }
  revokeOtherSessions(userId: string, currentSessionId?: string) {
    return this.sessions.revokeOtherSessions(userId, currentSessionId);
  }

  createApiKey(userId: string, dto: any) {
    return this.apiKeys.createApiKey(userId, dto);
  }
  getApiKeys(userId: string) {
    return this.apiKeys.getApiKeys(userId);
  }
  revokeApiKey(userId: string, keyId: string) {
    return this.apiKeys.revokeApiKey(userId, keyId);
  }
  validateApiKey(key: string) {
    return this.apiKeys.validateApiKey(key);
  }

  /**
   * Which sign-in method this platform uses.
   *
   * It used to answer with the *account's* stored preference, and 404 for an
   * address with no account. That is an account-enumeration oracle: anyone
   * could ask the platform whether a given address was registered, and the
   * answer was different for "no such person" and "that person signs in with
   * a code". The answer now depends on the platform alone, never on the
   * address, so the question reveals nothing about who has an account.
   */
  async lookupAuthMethod(_email: string) {
    let authMethod: string | null = null;
    try {
      const settings = await this.prisma.installationSettings.findFirst({
        select: { authMethod: true },
      });
      authMethod = settings?.authMethod ?? null;
    } catch {
      // The platform is not configured yet: the default stands.
    }
    return { authMethod: authMethod ?? 'PASSWORD' };
  }

  // Phase 5.1 — Verification flows
  sendVerification(
    dto: {
      email: string;
      type: 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'MAGIC_LINK';
    },
    ip?: string,
    ua?: string,
  ) {
    return this.verification.sendVerification(dto, ip, ua);
  }

  verifyEmail(dto: { token: string }, ip?: string, ua?: string) {
    return this.verification.verifyEmail(dto, ip, ua);
  }

  confirmPasswordReset(
    dto: { token: string; newPassword: string },
    ip?: string,
    ua?: string,
  ) {
    return this.verification.confirmPasswordReset(dto, ip, ua);
  }

  confirmMagicLink(dto: { token: string }, ip?: string, ua?: string) {
    return this.verification.confirmMagicLink(dto, ip, ua);
  }
}
