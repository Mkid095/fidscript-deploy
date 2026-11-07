'use client';

import { useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { ChoiceGroup } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ErrorState } from '@/components/ui/feedback';
import type { ProjectShape } from '@/lib/api/types';

import { updateShapeAction } from '@/app/(project)/projects/[projectId]/settings/actions';

/**
 * What this project is.
 *
 * The shape decides **what the project has**; the deployment switch decides
 * **whether deployments are on**. Both live on the project — nothing here
 * is remembered in the browser.
 */
export function ProjectShapeForm({
  projectId,
  shape,
  deploymentOn,
}: {
  projectId: string;
  shape: ProjectShape;
  deploymentOn: boolean;
}) {
  const [values, setValues] = useState({ shape, deploymentOn });

  // The server is the truth. When it says the shape changed, the form
  // starts again from it — so a radio the browser restored cannot change
  // what is saved.
  useEffect(() => {
    setValues({ shape, deploymentOn });
  }, [shape, deploymentOn]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const changed = values.shape !== shape || values.deploymentOn !== deploymentOn;

  const save = () => {
    setError(null);
    setWarning(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateShapeAction(projectId, values);
      if (result.error) setError(result.error);
      else {
        setSaved(true);
        setWarning(result.warning ?? null);
      }
    });
  };

  return (
    <div className="space-y-5">
      <ChoiceGroup
        legend="Shape"
        name="shape"
        value={values.shape}
        onChange={(next) => setValues({ ...values, shape: next as ProjectShape })}
        options={[
          {
            value: 'BACKEND',
            title: 'Backend as a service',
            body: 'The data, the users and the files. Your application talks to this.',
          },
          {
            value: 'DEPLOYMENT',
            title: 'Deployments',
            body: 'Ship the application you built, on the platform.',
          },
          {
            value: 'BOTH',
            title: 'Both',
            body: 'A backend to talk to, and somewhere to ship the application.',
          },
        ]}
      />

      <Switch
        label="Deployments"
        description="Turning this off hides the deployment items and stops new deployments. Running deployments keep running until you stop them."
        checked={values.deploymentOn}
        onChange={(next) => setValues({ ...values, deploymentOn: next })}
      />

      {error ? <ErrorState message={error} /> : null}
      {warning ? (
        <p className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
          {warning}
        </p>
      ) : null}
      {saved ? <p className="text-xs text-success">Saved.</p> : null}

      <Button variant="primary" onClick={save} loading={pending} disabled={!changed}>
        Save
      </Button>
    </div>
  );
}
