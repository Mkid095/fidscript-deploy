'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Spinner } from '@fidscript/ui';

// Top-level /functions/[id] redirects into the project shell so the sidebar stays visible.
// Without a project context it falls back to a minimal standalone page.
export default function FunctionDetailRedirect() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const functionId = params.id as string;
  const projectId = searchParams.get('project');

  useEffect(() => {
    if (projectId) {
      router.replace(`/projects/${projectId}/functions/${functionId}`);
    }
  }, [projectId, functionId, router]);

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-[var(--text-muted)] text-sm mb-2">No project context found.</p>
          <a href="/functions" className="text-sm text-[var(--accent)] hover:underline">
            Back to Functions
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-96">
      <Spinner size="lg" />
    </div>
  );
}
