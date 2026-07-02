'use client';

/**
 * Redirect to project-scoped scheduler job detail.
 * The old standalone /scheduler/[id]?project= route is deprecated.
 */
import { useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

export default function JobDetailRedirectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = params.id as string;
  const projectId = searchParams.get('project') ?? '';

  useEffect(() => {
    if (projectId && jobId) {
      router.replace(`/projects/${projectId}/scheduler/${jobId}`);
    }
  }, [projectId, jobId, router]);

  return null;
}
