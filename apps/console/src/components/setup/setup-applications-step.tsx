'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Card, SectionHeader } from '@/components/ui/card';
import { Badge, ErrorState } from '@/components/ui/feedback';

import { installApplicationAction } from '@/app/(setup)/setup/actions';

/**
 * What this platform provides.
 *
 * This is the only place the applications are presented as a choice. After
 * this they live in the settings, and one of them being added makes its
 * capability available to every project.
 */
export function SetupApplicationsStep({
  applications,
  chosen,
  onChosen,
  onNext,
  onBack,
}: {
  applications: Array<{
    id: string;
    title: string;
    summary: string;
    installed: boolean;
    installable?: boolean;
  }>;
  chosen: string[];
  onChosen: (next: string[]) => void;
  onNext: () => void;
  onBack?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (id: string) => {
    onChosen(
      chosen.includes(id)
        ? chosen.filter((entry) => entry !== id)
        : [...chosen, id],
    );
  };

  const install = () => {
    setError(null);
    startTransition(async () => {
      for (const id of chosen) {
        const result = await installApplicationAction(id);
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      onNext();
    });
  };

  return (
    <section>
      <SectionHeader
        title="What this platform provides"
        description="Tick what it should have. Anything left out can be added later."
      />
      <Card className="divide-y divide-rail">
        {applications.map((application) => (
          <label
            key={application.id}
            className="flex cursor-pointer items-start justify-between gap-4 px-4 py-3"
          >
            <span className="flex min-w-0 items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-3.5 accent-[var(--accent)]"
                checked={
                  application.installed || chosen.includes(application.id)
                }
                onChange={() => toggle(application.id)}
                disabled={application.installed}
              />
              <span className="min-w-0">
                <span className="block text-sm text-text">
                  {application.title}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-text-dim">
                  {application.summary}
                </span>
              </span>
            </span>
            {application.installed ? (
              <Badge tone="success">installed</Badge>
            ) : application.installable ? (
              <Badge tone="neutral">can be added</Badge>
            ) : (
              <Badge tone="neutral">not here</Badge>
            )}
          </label>
        ))}
      </Card>

      {error ? (
        <div className="mt-3">
          <ErrorState message={error} />
        </div>
      ) : null}

      <div className="mt-4 flex justify-end gap-2">
        {onBack ? (
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
        ) : null}
        <Button
          variant="primary"
          onClick={install}
          loading={pending}
          disabled={chosen.length === 0}
        >
          Install {chosen.length > 0 ? chosen.length : ''} application
          {chosen.length === 1 ? '' : 's'}
        </Button>
      </div>
    </section>
  );
}
