// The account flows — registering, signing out, changing a password, and
// asking for a reset.

import { type FidscriptSDK } from '@fidscript-deploy/sdk';

import { makeSdk } from '@/lib/sdk';
import { ACCESS_TOKEN_KEY, getNextRoute, storeTokens, clearTokens } from './auth-token-utils';

/** Signs out: the session is closed and the tokens are forgotten. */
export async function logoutMethod(
  sdkRef: React.MutableRefObject<FidscriptSDK | null>,
): Promise<void> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (accessToken) {
    try {
      const sdk = makeSdk(accessToken);
      await sdk.auth.logout();
    } catch {
      // best-effort
    }
  }
  clearTokens();
  sdkRef.current = null;
}

/**
 * Creates an account.
 *
 * A password account is signed in straight away; a magic-code account is
 * sent a code and signs in when it arrives.
 */
export async function registerMethod(
  email: string,
  name: string,
  password: string,
  authMethod: 'PASSWORD' | 'MAGIC_CODE',
  setupPassword: string,
  firstName: string,
  lastName: string,
  sendMagicCode: (email: string) => Promise<{ sent: boolean }>,
  login: (email: string, password: string) => Promise<void>,
): Promise<void> {
  const sdk = makeSdk();
  await sdk.auth.register(
    email,
    authMethod === 'PASSWORD' ? password : null,
    `${firstName.trim()} ${lastName.trim()}`,
    authMethod,
    setupPassword,
    firstName,
    lastName,
  );
  if (authMethod === 'PASSWORD') {
    await login(email, password);
  } else {
    await sendMagicCode(email);
  }
}

/** Changes the password and rotates the session. */
export async function changePasswordMethod(
  currentPassword: string,
  newPassword: string,
  sdkRef: React.MutableRefObject<FidscriptSDK | null>,
  hydrateUser: (accessToken: string) => Promise<Awaited<ReturnType<FidscriptSDK['auth']['me']>>>,
): Promise<void> {
  if (!sdkRef.current) throw new Error('Not authenticated');
  const res = await sdkRef.current.auth.changePassword(currentPassword, newPassword);
  storeTokens(res.accessToken, res.refreshToken);
  await hydrateUser(res.accessToken);
  window.location.href = getNextRoute();
}

/**
 * Asks for a password reset.
 *
 * The API answers "sent" whether or not the account exists — the form's copy
 * promises the same thing.
 */
export async function forgotPasswordMethod(email: string): Promise<void> {
  const sdk = makeSdk();
  await sdk.auth.sendVerification(email, 'PASSWORD_RESET');
}
