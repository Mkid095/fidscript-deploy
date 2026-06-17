import { Injectable } from '@nestjs/common';
import { AuthSessionService } from '@/modules/auth/services/auth-session.service';
import { AuthProfileService } from '@/modules/auth/services/auth-profile.service';
import { AuthSessionMgmtService } from '@/modules/auth/services/auth-session-mgmt.service';
import { AuthApiKeyService } from '@/modules/auth/services/auth-api-key.service';

export { AuthSessionService, AuthResponse } from '@/modules/auth/services/auth-session.service';

@Injectable()
export class AuthService {
  constructor(
    private session: AuthSessionService,
    private profile: AuthProfileService,
    private sessions: AuthSessionMgmtService,
    private apiKeys: AuthApiKeyService,
  ) {}

  register(dto: any, ip?: string, ua?: string) { return this.session.register(dto, ip, ua); }
  login(dto: any, ip?: string, ua?: string) { return this.session.login(dto, ip, ua); }
  logout(sessionId: string, userId: string) { return this.session.logout(sessionId, userId); }
  magicLink(dto: any) { return this.session.magicLink(dto); }
  verifyMagicLink(dto: any, ip?: string) { return this.session.verifyMagicLink(dto, ip); }
  refreshToken(token: string) { return this.session.refreshToken(token); }
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
