'use server';

import { revalidatePath } from 'next/cache';

import { createProject } from '@/lib/api/projects';
import type { Project, ProjectShape } from '@/lib/api/types';

/**
 * Creating a project.
 *
 * A **server action**, so the call happens on the server with the session
 * cookie — the browser never carries a token, and the shape travels with
 * the project rather than in the page.
 */
export async function createProjectAction(input: {
  name: string;
  type: string;
  shape: ProjectShape;
  deploymentOn: boolean;
}): Promise<{ project?: Project; error?: string }> {
  try {
    const project = await createProject({
      name: input.name,
      type: input.type,
      shape: input.shape,
      deploymentOn: input.deploymentOn,
    });
    revalidatePath('/projects');
    return { project };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The project could not be created.',
    };
  }
}
