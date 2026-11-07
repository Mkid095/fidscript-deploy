'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/feedback';

import { updateGeneralAction } from '@/app/(project)/projects/[projectId]/settings/actions';

/**
 * The project's name and description.
 *
 * The slug is **not** editable here — it is in the URL of every screen that
 * belongs to this project, so changing it would break the links people
 * have already shared.
 */
export function ProjectGeneralForm({
  projectId,
  name,
  description,
  slug,
}: {
  projectId: string;
  name: string;
  description: string;
  slug: string;
}) {
  const [values, setValues] = useState({ name, description });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateGeneralAction(projectId, values);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  };

  return (
    <div className="max-w-xl space-y-4">
      <Input
        label="Name"
        value={values.name}
        onChange={(event) => setValues({ ...values, name: event.target.value })}
      />
      <Input
        label="Description"
        hint="What this project is for. Optional."
        value={values.description}
        onChange={(event) => setValues({ ...values, description: event.target.value })}
      />
      <Input label="Slug" value={slug} readOnly disabled hint="It is in every link to this project." />

      {error ? <ErrorState message={error} /> : null}
      {saved ? <p className="text-xs text-success">Saved.</p> : null}

      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={save} loading={pending}>
          Save
        </Button>
      </div>
    </div>
  );
}
