'use server';

import { revalidatePath } from 'next/cache';

import { serverApi as api } from '@/lib/api/server';

/**
 * Inviting somebody into a project.
 *
 * The API hands back the invitation's token, so the console can show the
 * link that was made — the platform does not send the mail itself.
 */
export async function inviteMemberAction(
  projectId: string,
  input: { email: string; role: string },
): Promise<{
  ok?: boolean;
  token?: string;
  expiresAt?: string;
  error?: string;
}> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { error: 'An invitation needs an email address.' };

  try {
    const response = await api.post<{
      invitationId: string;
      token: string;
      expiresAt: string;
    }>(`/projects/${projectId}/invitations`, { email, role: input.role });
    revalidatePath(`/projects/${projectId}/members`);
    return { ok: true, token: response.token, expiresAt: response.expiresAt };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The invitation could not be sent.',
    };
  }
}
