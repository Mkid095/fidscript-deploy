'use server';

import { revalidatePath } from 'next/cache';

import { serverApi } from '@/lib/api/server';
import { reclaimSpace } from '@/lib/api/metrics';
import {
  saveBackupDestination,
  clearBackupDestination,
  runPlatformBackup,
  verifyPlatformRestore,
  type BackupDestinationConfig,
} from '@/lib/api/platform';

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

/**
 * The hands on the platform's own disaster recovery.
 *
 * Each one does the work and revalidates the System screen, so the card the
 * operator just acted on reflects what just happened.
 */

/** Run a backup now. */
export async function runBackupAction(): Promise<{ error?: string }> {
  try {
    await runPlatformBackup();
    revalidatePath('/system');
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The backup could not be run.',
    };
  }
}

/** Prove the newest backup restores. */
export async function verifyBackupAction(): Promise<{
  error?: string;
  ok?: boolean;
}> {
  try {
    const result = await verifyPlatformRestore();
    revalidatePath('/system');
    return { ok: result.ok, error: result.error };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The restore could not be verified.',
    };
  }
}

/** Point the backups at an S3-compatible destination. Saved only if it answers. */
export async function saveBackupDestinationAction(
  config: BackupDestinationConfig,
): Promise<{ error?: string }> {
  try {
    await saveBackupDestination(config);
    revalidatePath('/system');
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The destination could not be saved.',
    };
  }
}

/** Back to the platform's own MinIO. */
export async function clearBackupDestinationAction(): Promise<{
  error?: string;
}> {
  try {
    await clearBackupDestination();
    revalidatePath('/system');
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : 'The destination could not be cleared.',
    };
  }
}

/**
 * Reclaim what the Docker daemon itself calls reclaimable — dangling
 * images, stopped containers, unused networks, build cache nothing
 * references. Volumes, tagged images and running containers are never
 * touched.
 */
export async function reclaimSpaceAction(): Promise<{
  error?: string;
  reclaimedBytes?: number;
}> {
  try {
    const result = await reclaimSpace();
    revalidatePath('/system');
    return { reclaimedBytes: result.reclaimedBytes };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The space could not be reclaimed.',
    };
  }
}
