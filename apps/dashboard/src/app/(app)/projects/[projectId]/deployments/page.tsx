'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Spinner } from '@fidscript/ui';

// The F05 project dashboard shell renders the deployments section via `?section=deployments`.
// We keep that pattern but expose a clean path-segment URL for the sidebar — this client
// component redirects to the section URL on mount.
export default function DeploymentsRoute() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  useEffect(() => {
    router.replace(`/projects/${projectId}?section=deployments`);
  }, [projectId, router]);

  return (
    <div className="flex items-center justify-center min-h-96">
      <Spinner size="lg" />
    </div>
  );
}
