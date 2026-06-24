'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Spinner } from '@fidscript/ui';

export default function SettingsRoute() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  useEffect(() => {
    router.replace(`/projects/${projectId}?section=settings`);
  }, [projectId, router]);

  return (
    <div className="flex items-center justify-center min-h-96">
      <Spinner size="lg" />
    </div>
  );
}
