'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * The project console.
 *
 * A project is a set of resources, and each one has its own page: the
 * services, the functions, the databases, the storage. This route used to
 * render a section chosen by a query parameter (`?section=…`) as well —
 * a second way of asking for the same screen, which nothing linked to and
 * which the sidebar could not reach.
 *
 * There is one way now: a path per section, and this route sends the
 * operator to the project's first one.
 */
export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  useEffect(() => {
    if (projectId) router.replace(`/projects/${projectId}/services`);
  }, [projectId, router]);

  return null;
}
