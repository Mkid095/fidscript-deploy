'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';

/**
 * Send a caller to the project console.
 *
 * The flat routes — `/functions`, `/databases`, `/logs` — were a second way
 * of asking for a project's resources: the same screens, without a project
 * in the address. The project console is the one way, so the flat route
 * sends the caller there: to the project they were last in (the platform
 * lists the most recently touched first), or to the project picker when
 * they have no projects at all.
 */
export function RedirectToProject({
  section,
  tab,
  id,
}: {
  section: string;
  tab?: string;
  id?: string;
}) {
  const { getSdk } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function go() {
      try {
        const { projects } = await getSdk().projects.list();
        if (cancelled) return;
        const project = projects?.[0];
        if (!project) {
          router.replace('/projects');
          return;
        }
        const query = tab ? `?tab=${tab}` : '';
        const suffix = id ? `/${id}` : '';
        router.replace(`/projects/${project.slug ?? project.id}/${section}${suffix}${query}`);
      } catch {
        if (!cancelled) router.replace('/projects');
      }
    }

    void go();
    return () => {
      cancelled = true;
    };
  }, [getSdk, router, section, tab, id]);

  return (
    <div className="flex items-center justify-center min-h-64">
      <Spinner size="lg" />
    </div>
  );
}
