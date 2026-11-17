'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Card, SectionHeader } from '@/components/ui/card';
import type { DeletionTask } from '@/lib/api/metrics';
import { retryDeletionTaskAction } from '@/app/(platform)/system/actions';

/**
 * The deletion cleanups that did not finish.
 *
 * A project was deleted, and taking its surface down failed at some step —
 * or is still running past its stall window. What failed is named, and a
 * press retries the cleanup from where it stopped.
 */
export function DeletionTasksCard({ tasks }: { tasks: DeletionTask[] }) {
  if (tasks.length === 0) return null;
  return (
    <section>
      <SectionHeader
        title="Deletion cleanups that did not finish"
        description="A deleted project whose surface the cleanup has not taken down yet. Retry resumes where it stopped."
      />
      <Card className="divide-y divide-rail p-0">
        {tasks.map((task) => (
          <DeletionTaskRow key={task.projectId} task={task} />
        ))}
      </Card>
    </section>
  );
}

function DeletionTaskRow({ task }: { task: DeletionTask }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const retry = () => {
    setError(null);
    startTransition(async () => {
      const result = await retryDeletionTaskAction(task.projectId);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">
          {task.projectSlug ?? task.projectId}
        </p>
        <p className="mt-0.5 text-xs text-text-dim">
          {task.state === 'CLEANUP_FAILED' ? 'The cleanup failed' : 'Still running'}
          {task.attempts > 0 ? ` — ${task.attempts} attempt${task.attempts === 1 ? '' : 's'}` : ''}
        </p>
        {task.lastError ? (
          <p className="mt-1 max-w-xl text-xs text-danger">{task.lastError}</p>
        ) : null}
        {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      </div>
      <Button variant="primary" size="sm" onClick={retry} disabled={pending}>
        {pending ? 'Retrying…' : 'Retry the cleanup'}
      </Button>
    </div>
  );
}
