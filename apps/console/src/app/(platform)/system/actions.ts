'use server';

import { revalidatePath } from 'next/cache';

import { serverApi } from '@/lib/api/server';

/**
 * Re-run the cleanup for a deleted project whose teardown failed or stalled.
 *
 * Idempotent: the steps that already finished are recorded, so a retry
 * resumes where it stopped rather than redoing the work — and it cannot
 * recreate the website, only finish taking it down.
 */
export async function retryDeletionTaskAction(
  projectId: string,
): Promise<{ error?: string }> {
  try {
    await serverApi.post(`/system/deletion-tasks/${projectId}/retry`);
    revalidatePath('/system');
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : 'The cleanup could not be retried.',
    };
  }
}
