/**
 * Multi-factor authentication.
 *
 * The API issues a challenge instead of tokens when an account has MFA on,
 * so the client has to be able to ask for the second half. It had no MFA
 * methods at all — a client that typed a password for an MFA account got a
 * response with no tokens in it and no way to finish.
 */
import type { AuthMfaHost } from './auth-host';
import type {
  AuthResponse,
  MfaSetupResponse,
  MfaStatusResponse,
  MfaRecoveryCodesResponse,
} from './auth-types';

export function applyAuthMfaMethods(host: AuthMfaHost): void {
  const client = host.client;

  /**
   * Starts the enrollment: the secret and the otpauth URL for the
   * authenticator app.
   *
   * When MFA is already on, `currentCode` is the code from the
   * authenticator — replacing a second factor needs the second factor.
   */
  host.mfaSetup = (currentCode?: string) =>
    client.post<MfaSetupResponse>('/api/v1/auth/mfa/setup', {
      ...(currentCode ? { code: currentCode } : {}),
    });

  /** Confirms the first code and turns MFA on. */
  host.mfaVerify = (code: string) =>
    client.post<{ enabled: true }>('/api/v1/auth/mfa/verify', { code });

  /** Whether MFA is on, and how many recovery codes are left. */
  host.mfaStatus = () => client.get<MfaStatusResponse>('/api/v1/auth/mfa/status');

  /**
   * A fresh set of recovery codes.
   *
   * They are returned **once**. There is no way to read them again — the
   * platform keeps only their hashes.
   */
  host.mfaRecoveryCodes = () =>
    client.post<MfaRecoveryCodesResponse>('/api/v1/auth/mfa/recovery-codes');

  /**
   * Turns MFA off.
   *
   * `proof` is a reauthentication: the account's password, or a code from
   * the authenticator. A session alone is not enough.
   */
  host.mfaDisable = (proof: { password?: string; code?: string }) =>
    client.post<{ disabled: true }>('/api/v1/auth/mfa/disable', {
      ...(proof.password ? { password: proof.password } : {}),
      ...(proof.code ? { code: proof.code } : {}),
    });

  /**
   * Finishes a sign-in that stopped at the challenge.
   *
   * `code` is a 6-digit TOTP code, or a recovery code.
   */
  host.mfaChallenge = (mfaToken: string, code: string) =>
    client.post<AuthResponse>('/api/v1/auth/mfa/challenge', { mfaToken, code });
}
