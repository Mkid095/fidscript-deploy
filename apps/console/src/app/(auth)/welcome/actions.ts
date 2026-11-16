'use server';

import { serverApi as api } from '@/lib/api/server';

/**
 * The first-time journey.
 *
 * Two things it changes: the person's name, and the fact that it has been
 * done. The project itself is created by the same action the platform
 * level uses — there is one way to make a project, not two.
 */
export async function setNameAction(
  name: string,
): Promise<{ ok?: boolean; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: 'Tell us what to call you.' };

  try {
    await api.patch('/auth/me', { name: trimmed });
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : 'The name could not be saved.',
    };
  }
}

export async function completeOnboardingAction(): Promise<{
  ok?: boolean;
  error?: string;
}> {
  try {
    await api.post('/auth/onboarding/complete');
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : 'The journey could not be closed.',
    };
  }
}
