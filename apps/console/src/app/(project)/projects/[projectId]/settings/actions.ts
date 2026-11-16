'use server';

import { revalidatePath } from 'next/cache';

import {
  archiveProject,
  deleteProject,
  provisionInstantApp,
  setProjectShape,
  updateProject,
} from '@/lib/api/project';
import type { ProjectShape } from '@/lib/api/types';

/**
 * Changing a project's settings.
 *
 * Every one of these is a **server action** — the session cookie stays on
 * the server, and the change is written to the project, not to the browser.
 */

/** The name and the description. */
export async function updateGeneralAction(
  projectId: string,
  input: { name: string; description: string },
): Promise<{ ok?: boolean; error?: string }> {
  const name = input.name.trim();
  if (!name) return { error: 'A project needs a name.' };

  try {
    await updateProject(projectId, {
      name,
      description: input.description.trim() || null,
    });
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : 'The project could not be saved.',
    };
  }
}

/**
 * The shape, and whether the deployment service is on.
 *
 * Adding the backend **provisions the app** — the guide says the app is
 * ready the moment the shape says so, not later. Removing it only hides the
 * group: the app and its data are kept.
 */
export async function updateShapeAction(
  projectId: string,
  input: { shape: ProjectShape; deploymentOn: boolean },
): Promise<{ ok?: boolean; warning?: string; error?: string }> {
  try {
    const wantsBackend = input.shape === 'BACKEND' || input.shape === 'BOTH';
    let warning: string | undefined;

    if (wantsBackend) {
      const instant = await provisionInstantApp(projectId).catch(() => null);
      if (!instant) {
        // The shape still moves — but say plainly that there is no app yet.
        warning =
          'The shape was saved, but no application backend could be created.';
      }
    }

    await setProjectShape(projectId, input.shape, input.deploymentOn);
    revalidatePath(`/projects/${projectId}`);
    return warning ? { ok: true, warning } : { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : 'The shape could not be changed.',
    };
  }
}

/** Archive the project. It stops; it keeps everything it has. */
export async function archiveProjectAction(
  projectId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await archiveProject(projectId);
    revalidatePath('/projects');
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The project could not be archived.',
    };
  }
}

/** Delete the project, and everything in it. */
export async function deleteProjectAction(
  projectId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await deleteProject(projectId);
    revalidatePath('/projects');
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The project could not be deleted.',
    };
  }
}
