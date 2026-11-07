import { Injectable } from '@nestjs/common';
import { MfaService } from '@/modules/auth/mfa/mfa.service';
import { MfaChallengeService } from '@/modules/auth/mfa/mfa-challenge.service';
import { MfaRecoveryCodeService } from '@/modules/auth/mfa/mfa-recovery-code.service';
import { AuthSessionService } from '@/modules/auth/services/auth-session.service';

/**
 * The MFA surface, as the controller sees it.
 *
 * Everything a person can do with a second factor lives here: turn it on,
 * turn it off, hold recovery codes, and finish a sign-in that stopped at the
 * challenge.
 */
@Injectable()
export class AuthMfaService {
  constructor(
    private readonly mfa: MfaService,
    private readonly challenge: MfaChallengeService,
    private readonly recoveryCodes: MfaRecoveryCodeService,
    private readonly session: AuthSessionService,
  ) {}

  /** The secret and the otpauth URL for the authenticator app. */
  setup(userId: string, code?: string) {
    return this.mfa.setup(userId, code);
  }

  /** Confirms the first code and turns MFA on. */
  enable(userId: string, code: string) {
    return this.mfa.enable(userId, code);
  }

  /** Turns MFA off. Needs the password or a code from the authenticator. */
  disable(userId: string, proof: { password?: string; code?: string }) {
    return this.mfa.disable(userId, proof);
  }

  /** A fresh set of recovery codes, shown once. */
  generateRecoveryCodes(userId: string) {
    return this.recoveryCodes.generate(userId);
  }

  /** Whether MFA is on, and how many recovery codes are left. */
  async status(userId: string) {
    const remaining = await this.recoveryCodes.remaining(userId);
    const enabled = await this.mfa.isEnabled(userId);
    return { enabled, recoveryCodesRemaining: remaining.remaining };
  }

  /**
   * The second half of a sign-in.
   *
   * The challenge proved the second factor; this mints the session the
   * first half was holding back.
   */
  async completeLogin(
    dto: { mfaToken: string; code: string },
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.challenge.complete(dto.mfaToken, dto.code, ipAddress, userAgent);
    const sess = await this.session.createSession(user.id, ipAddress, userAgent);
    return this.session.buildAuthResponse(user, sess);
  }
}
