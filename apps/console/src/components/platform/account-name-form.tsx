'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/feedback';

import { updateNameAction } from '@/app/(platform)/settings/actions';

/**
 * The name the platform shows beside everything you do.
 */
export function AccountNameForm({ name }: { name: string | null }) {
  const [value, setValue] = useState(name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateNameAction(value);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  };

  return (
    <div className="max-w-sm space-y-3">
      <Input
        label="Name"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      {error ? <ErrorState message={error} /> : null}
      {saved ? <p className="text-xs text-success">Saved.</p> : null}
      <Button
        variant="secondary"
        size="sm"
        onClick={save}
        loading={pending}
        disabled={!value.trim() || value.trim() === name}
      >
        Save
      </Button>
    </div>
  );
}
