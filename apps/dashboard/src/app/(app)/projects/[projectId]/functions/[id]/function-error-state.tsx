'use client';

import Link from 'next/link';

interface Props {
  error: string | null;
  projectId: string;
}

export function FunctionErrorState({ error, projectId }: Props) {
  return (
    <div className="text-center py-12">
      <p className="text-[var(--danger)] text-sm mb-4">{error ?? 'Function not found'}</p>
      <Link href={`/projects/${projectId}/functions`} className="text-sm text-[var(--accent)] hover:underline">
        Back to Functions
      </Link>
    </div>
  );
}
