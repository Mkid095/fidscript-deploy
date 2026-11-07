'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/feedback';

import {
  archiveProjectAction,
  deleteProjectAction,
} from '@/app/(project)/projects/[projectId]/settings/actions';

/**
 * The dangerous end of the settings.
 *
 * Archiving stops the project and keeps everything in it. Deleting does not
 * — so it asks for the project's name, typed out, before it will do it.
 */
export function ProjectDangerZone({
  projectId,
  name,
  status,
}: {
  projectId: string;
  name: string;
  status: string;
}) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok?: boolean; error?: string }>, gone = false) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else if (gone) router.push('/projects');
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text">Archive this project</p>
          <p className="mt-0.5 text-xs leading-relaxed text-text-dim">
            It stops where it is. Everything it has is kept, and it can be restored.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => run(() => archiveProjectAction(projectId))}
          loading={pending}
          disabled={status === 'ARCHIVED'}
        >
          {status === 'ARCHIVED' ? 'Archived' : 'Archive'}
        </Button>
      </div>

      <div className="rounded-lg border border-danger/40 bg-danger/5 p-4">
        <p className="text-sm font-medium text-danger">Delete this project</p>
        <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
          The project, its deployments, its data and its secrets are gone. Type{' '}
          <strong className="font-medium text-text">{name}</strong> to confirm.
        </p>

        <div className="mt-3 space-y-3">
          <Input
            label="Type the project's name"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={name}
          />
          <Button
            variant="danger"
            disabled={confirmation !== name}
            loading={pending}
            onClick={() => run(() => deleteProjectAction(projectId), true)}
          >
            Delete permanently
          </Button>
        </div>
      </div>

      {error ? <ErrorState message={error} /> : null}
    </div>
  );
}
