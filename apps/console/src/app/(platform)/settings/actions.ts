'use server';

import { revalidatePath } from 'next/cache';

import { serverApi as api } from '@/lib/api/server';

/**
 * The account.
 *
 * The name, the sessions, and the second factor. All of it is the
 * platform's — the console asks.
 */

/** Change the name the platform shows beside everything you do. */
export async function updateNameAction(
  name: string,
): Promise<{ ok?: boolean; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: 'Tell us what to call you.' };

  try {
    await api.patch('/auth/me', { name: trimmed });
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : 'The name could not be saved.',
    };
  }
}

/** End one session — the one on another machine, or an old one. */
export async function revokeSessionAction(
  sessionId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.delete(`/auth/sessions/${sessionId}`);
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : 'The session could not be ended.',
    };
  }
}

/**
 * End every session except this one — the agent's old curl sessions, the
 * machine that was lost — in one press, with the session doing the asking
 * left alive.
 */
export async function revokeOtherSessionsAction(): Promise<{
  ok?: boolean;
  revoked?: number;
  error?: string;
}> {
  try {
    const result = await api.delete<{ success: boolean; revoked: number }>(
      '/auth/sessions/others',
    );
    revalidatePath('/settings');
    return { ok: true, revoked: result.revoked };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The other sessions could not be ended.',
    };
  }
}

/**
 * Connect the GitHub account.
 *
 * The token is checked against GitHub before it is kept, and it is stored
 * encrypted — the platform never shows it again.
 */
export async function connectGithubAction(
  token: string,
): Promise<{ ok?: boolean; username?: string; error?: string }> {
  if (!token.trim()) return { error: 'The token is needed.' };

  try {
    const response = await api.post<{ username?: string }>(
      '/users/me/github/token',
      {
        token: token.trim(),
      },
    );
    revalidatePath('/settings/integrations');
    return { ok: true, username: response.username };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The account could not be connected. The token may be wrong, or it may not have the repository scope.',
    };
  }
}

/** Let the GitHub account go. The token goes with it. */
export async function disconnectGithubAction(): Promise<{
  ok?: boolean;
  error?: string;
}> {
  try {
    await api.delete('/users/me/github/disconnect');
    revalidatePath('/settings/integrations');
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The account could not be disconnected.',
    };
  }
}

/** Make a key that acts as you. It is shown once. */
export async function createApiKeyAction(
  name: string,
): Promise<{ ok?: boolean; key?: string; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: 'The key needs a name.' };

  try {
    const response = await api.post<{
      key?: string;
      apiKey?: { key?: string };
    }>('/auth/api-keys', {
      name: trimmed,
    });
    revalidatePath('/settings/api-keys');
    return { ok: true, key: response.key ?? response.apiKey?.key };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The key could not be made.',
    };
  }
}

/** End a key. Whatever it was doing stops working. */
export async function revokeApiKeyAction(
  keyId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.delete(`/auth/api-keys/${keyId}`);
    revalidatePath('/settings/api-keys');
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : 'The key could not be revoked.',
    };
  }
}

/**
 * Begin turning two-factor on.
 *
 * The API answers with the secret and the otpauth URL — the URL is what
 * the authenticator app reads, and it is shown once.
 */
export async function startMfaSetupAction(): Promise<{
  ok?: boolean;
  secret?: string;
  otpauthUrl?: string;
  error?: string;
}> {
  try {
    const response = await api.post<{ secret: string; otpauthUrl: string }>(
      '/auth/mfa/setup',
      {},
    );
    return {
      ok: true,
      secret: response.secret,
      otpauthUrl: response.otpauthUrl,
    };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The second factor could not be set up. It needs your password to be confirmed again.',
    };
  }
}

/** Confirm the first code, and two-factor is on. */
export async function enableMfaAction(
  code: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.post('/auth/mfa/verify', { code: code.trim() });
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'That code was not accepted.',
    };
  }
}

/** Turn two-factor off. It needs the password, or a code from the app. */
export async function disableMfaAction(input: {
  password?: string;
  code?: string;
}): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.post('/auth/mfa/disable', {
      ...(input.password ? { password: input.password } : {}),
      ...(input.code ? { code: input.code.trim() } : {}),
    });
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The second factor could not be turned off.',
    };
  }
}

/** A fresh set of recovery codes. They are shown once. */
export async function newRecoveryCodesAction(): Promise<{
  ok?: boolean;
  codes?: string[];
  error?: string;
}> {
  try {
    const response = await api.post<{
      recoveryCodes?: string[];
      codes?: string[];
    }>('/auth/mfa/recovery-codes', {});
    revalidatePath('/settings');
    return { ok: true, codes: response.recoveryCodes ?? response.codes ?? [] };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : 'The codes could not be made.',
    };
  }
}
