// The sign-in flows — password, magic code, and the second factor.
// Split out of auth-methods.ts so every file stays under the line limit.

import { type FidscriptSDK } from '@fidscript-deploy/sdk';

import { makeSdk } from '@/lib/sdk';
import {
  getNextRoute, storeTokens, storeMfaToken, getMfaToken, clearMfaToken,
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

/** Asks for a magic code. Always succeeds — it never says who has an account. */
export async function sendMagicCodeMethod(email: string): Promise<{ sent: boolean }> {
  const sdk = makeSdk();
  return sdk.auth.sendMagicCode(email);
}

/** Signs in with the code that arrived by mail. */
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

/**
 * Which sign-in method the platform uses.
 *
 * It answers with the **platform's** setting, never the account's — so
 * asking does not say whether the address is registered.
 */
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
