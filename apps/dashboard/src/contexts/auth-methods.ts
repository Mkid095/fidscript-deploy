// Auth method implementations — extracted to keep auth-provider.tsx under 150 lines

import { type FidscriptSDK } from '@fidscript-deploy/sdk';

import { makeSdk } from '@/lib/sdk';
import { ACCESS_TOKEN_KEY, getNextRoute, storeTokens, clearTokens } from './auth-token-utils';

export async function loginMethod(
  email: string,
  password: string,
  sdkRef: React.MutableRefObject<FidscriptSDK | null>,
  buildSdk: (token: string) => void,
): Promise<void> {
  const sdk = makeSdk();
  const res = await sdk.auth.login(email, password);
  storeTokens(res.accessToken, res.refreshToken);
  buildSdk(res.accessToken);
  const user = await sdkRef.current!.auth.me();
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
  inviteKeyword: string,
  sendMagicCode: (email: string) => Promise<{ sent: boolean }>,
  login: (email: string, password: string) => Promise<void>,
): Promise<void> {
  const sdk = makeSdk();
  await sdk.auth.register(
    email,
    authMethod === 'PASSWORD' ? password : null,
    name,
    authMethod,
    inviteKeyword,
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
  const user = await sdkRef.current!.auth.me();
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
