// Auth method implementations — extracted to keep auth-provider.tsx under 150 lines

import { type FidscriptSDK } from '@fidscript-deploy/sdk';

import { makeSdk } from '@/lib/sdk';
import {
  ACCESS_TOKEN_KEY, getNextRoute, storeTokens, clearTokens, storeMfaToken,
  getMfaToken, clearMfaToken,
} from './auth-token-utils';

/**
 * Signs in with a password.
 *
 * An account with a second factor does not get tokens here: the API answers
 * with a challenge, and the person has one more thing to do. The challenge
 * token used to be thrown away — the client stored `undefined` as if it were
 * an access token and sent the person into the app, where the first request
 * failed and bounced them back to the login screen, forever.
 */
export async function loginMethod(
  email: string,
  password: string,
  sdkRef: React.MutableRefObject<FidscriptSDK | null>,
  buildSdk: (token: string) => void,
): Promise<{ mfaRequired: true } | undefined> {
  const sdk = makeSdk();
  const res = await sdk.auth.login(email, password);

  if (res.mfaRequired === true) {
    storeMfaToken(res.mfaToken);
    const next = encodeURIComponent(getNextRoute());
    window.location.href = `/login/mfa?next=${next}`;
    return { mfaRequired: true };
  }

  storeTokens(res.accessToken, res.refreshToken);
  buildSdk(res.accessToken);
  window.location.href = getNextRoute();
  return undefined;
}

/**
 * Finishes a sign-in that stopped at the second factor.
 *
 * `code` is a 6-digit code from the authenticator, or a recovery code.
 */
export async function mfaChallengeMethod(
  code: string,
  sdkRef: React.MutableRefObject<FidscriptSDK | null>,
  buildSdk: (token: string) => void,
): Promise<void> {
  const mfaToken = getMfaToken();
  if (!mfaToken) {
    throw new Error('This sign-in expired — enter your password again.');
  }
  const sdk = makeSdk();
  const res = await sdk.auth.mfaChallenge(mfaToken, code);
  storeTokens(res.accessToken, res.refreshToken);
  buildSdk(res.accessToken);
  clearMfaToken();
  window.location.href = getNextRoute();
}

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

export async function lookupAuthMethodMethod(
  email: string,
): Promise<'PASSWORD' | 'MAGIC_CODE' | null> {
  try {
    const sdk = makeSdk();
    const res = await sdk.auth.lookupAuthMethod(email);
    return res.authMethod;
  } catch {
    return null;
  }
}

export async function sendMagicCodeMethod(email: string): Promise<{ sent: boolean }> {
  const sdk = makeSdk();
  return sdk.auth.sendMagicCode(email);
}

export async function verifyMagicCodeMethod(
  email: string,
  code: string,
  sdkRef: React.MutableRefObject<FidscriptSDK | null>,
  buildSdk: (token: string) => void,
): Promise<void> {
  const sdk = makeSdk();
  const res = await sdk.auth.verifyMagicCode(email, code);
  storeTokens(res.accessToken, res.refreshToken);
  buildSdk(res.accessToken);
  window.location.href = getNextRoute();
}

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

export async function forgotPasswordMethod(
  email: string,
): Promise<void> {
  const sdk = makeSdk();
  await sdk.auth.sendVerification(email, 'PASSWORD_RESET');
}
