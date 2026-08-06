/**
 * Auth core methods — register, login, magic code, verification flows.
 * Split out of auth.ts for ANPAS 150-line limit.
 */

import type { AuthCoreHost } from './auth-host';

export function applyAuthCoreMethods(host: AuthCoreHost): void {
  const client = host.client;

  host.register = (email, password, name, authMethod, inviteKeyword) =>
    client.post<import('./auth-types').AuthResponse>('/api/v1/auth/register', {
      email, password, name, authMethod, inviteKeyword,
    });

  host.login = (email, password) =>
    client.post<import('./auth-types').AuthResponse>('/api/v1/auth/login', { email, password });

  host.lookupAuthMethod = (email) =>
    client.get<import('./auth-types').AuthMethodResponse>(`/api/v1/auth/auth-method/${encodeURIComponent(email)}`);

  host.logout = () => client.post('/api/v1/auth/logout');

  host.me = async () => {
    const r = await client.get<{ user: import('./auth-types').User }>('/api/v1/auth/me');
    return r.user;
  };

  host.refreshToken = (refreshToken) =>
    client.post<import('./auth-types').AuthResponse>('/api/v1/auth/refresh', { refreshToken });

  host.changePassword = (currentPassword, newPassword) =>
    client.post<import('./auth-types').AuthResponse>('/api/v1/auth/change-password', { currentPassword, newPassword });

  host.sendMagicCode = (email) =>
    client.post<import('./auth-types').MagicCodeSendResponse>('/api/v1/auth/magic-code', { email });

  host.verifyMagicCode = (email, code) =>
    client.post<import('./auth-types').MagicCodeVerifyResponse>('/api/v1/auth/verify-magic-code', { email, code });

  host.sendVerification = (email, type) =>
    client.post<import('./auth-types').SendVerificationResponse>('/api/v1/auth/send-verification', { email, type });

  host.verifyEmail = (token) =>
    client.post<import('./auth-types').VerifyEmailResponse>('/api/v1/auth/verify-email', { token });

  host.confirmPasswordReset = (token, newPassword) =>
    client.post<import('./auth-types').ConfirmPasswordResetResponse>('/api/v1/auth/password-reset', { token, newPassword });

  host.confirmMagicLink = (token) =>
    client.post<import('./auth-types').AuthResponse>('/api/v1/auth/magic-link/verify', { token });
}
