'use server';

import { serverApi as api } from '@/lib/api/server';

/**
 * Accepting an invitation.
 *
 * The API matches the token against the invitation and adds the account
 * with that email to the project. If there is no account with that email,
 * it says so — the console does not paper over it.
 */
export async function acceptInvitationAction(
  token: string,
): Promise<{ ok?: boolean; projectId?: string; error?: string }> {
  if (!token) return { error: 'That link has no invitation in it.' };

  try {
    const response = await api.post<{ success: boolean; projectId: string }>('/invitations/accept', {
      token,
    });
    return { ok: true, projectId: response.projectId };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The invitation could not be accepted.',
    };
  }
}
