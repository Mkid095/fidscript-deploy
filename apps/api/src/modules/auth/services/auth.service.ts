import { Injectable } from '@nestjs/common';
import { AuthSessionService } from '@/modules/auth/services/auth-session.service';
import { AuthRegisterService } from '@/modules/auth/services/auth-register.service';
import { AuthLoginService } from '@/modules/auth/services/auth-login.service';
import { AuthTokenService } from '@/modules/auth/services/auth-token.service';
import { AuthProfileService } from '@/modules/auth/services/auth-profile.service';
import { AuthSessionMgmtService } from '@/modules/auth/services/auth-session-mgmt.service';
import { AuthApiKeyService } from '@/modules/auth/services/auth-api-key.service';
import { AuthPasswordService } from '@/modules/auth/services/auth-password.service';
import { MfaService } from '@/modules/auth/mfa/mfa.service';

export { AuthSessionService, AuthResponse } from '@/modules/auth/services/auth-session.service';

@Injectable()
export class AuthService {
  constructor(
    private session: AuthSessionService,
    private authRegister: AuthRegisterService,
    private authLogin: AuthLoginService,
    private authToken: AuthTokenService,
    private profile: AuthProfileService,
    private sessions: AuthSessionMgmtService,
    private apiKeys: AuthApiKeyService,
    private password: AuthPasswordService,
    private mfa: MfaService,
  ) {}

  async register(dto: any, ip?: string, ua?: string) {
    const user = await this.authRegister.register(dto, ip, ua);
    const sess = await this.session.createSession(user.id, ip, ua);
    return this.session.buildAuthResponse(user, sess);
  }

  async login(dto: any, ip?: string, ua?: string) {
    const result = await this.authLogin.login(dto, ip, ua);
    if (result.mfaToken) return { mfaRequired: true, mfaToken: result.mfaToken };
    const sess = await this.session.createSession(result.user.id, ip, ua);
    return this.session.buildAuthResponse(result.user, sess);
  }

  async completeMfaLogin(dto: { mfaToken: string; code: string }, ip?: string, ua?: string) {
    const user = await this.mfa.completeChallenge(dto.mfaToken, dto.code, ip, ua);
    const sess = await this.session.createSession(user.id, ip, ua);
    return this.session.buildAuthResponse(user, sess);
  }

  setupMfa(userId: string) { return this.mfa.setup(userId); }
  enableMfa(userId: string, code: string) { return this.mfa.enable(userId, code); }

  logout(sessionId: string, userId: string) { return this.authLogin.logout(sessionId, userId); }

  changePassword(userId: string, sessionId: string | undefined, dto: { currentPassword: string; newPassword: string }, ip?: string, ua?: string) {
    return this.password.changePassword(userId, sessionId, dto, ip, ua);
  }

  magicLink(dto: any) { return this.authToken.magicLink(dto); }

  async verifyMagicLink(dto: any, ip?: string) {
    const { user, session: oldSession } = await this.authToken.verifyMagicLink(dto, ip);
    const sess = await this.session.createSession(user.id, oldSession?.ipAddress ?? ip ?? undefined);
    return this.session.buildAuthResponse(user, sess);
  }

  async refreshToken(token: string) {
    const { user, oldSession } = await this.authToken.refreshToken(token);
    const sess = await this.session.createSession(user.id, oldSession?.ipAddress ?? undefined);
    return this.session.buildAuthResponse(user, sess);
  }

  createSession(userId: string, ip?: string, ua?: string) { return this.session.createSession(userId, ip, ua); }
  buildAuthResponse(user: any, session: any) { return this.session.buildAuthResponse(user, session); }

  getProfile(userId: string) { return this.profile.getProfile(userId); }
  updateProfile(userId: string, dto: any) { return this.profile.updateProfile(userId, dto); }

  getSessions(userId: string) { return this.sessions.getSessions(userId); }
  revokeSession(userId: string, sessionId: string) { return this.sessions.revokeSession(userId, sessionId); }
  revokeAllSessions(userId: string) { return this.sessions.revokeAllSessions(userId); }

  createApiKey(userId: string, dto: any) { return this.apiKeys.createApiKey(userId, dto); }
  getApiKeys(userId: string) { return this.apiKeys.getApiKeys(userId); }
  revokeApiKey(userId: string, keyId: string) { return this.apiKeys.revokeApiKey(userId, keyId); }
  validateApiKey(key: string) { return this.apiKeys.validateApiKey(key); }
}
