'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { ChoiceGroup, Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/feedback';
import { Dialog } from '@/components/ui/dialog';

import { createProjectAction } from '@/app/(platform)/projects/actions';

/**
 * Making a project.
 *
 * It is behind a button, in a panel of its own: the projects page is for
 * the projects that are there.
 *
 * A project is a **directory for one application**. When somebody has a
 * new application, they make a new project and name it after it — the
 * project's menu is then derived from what it is for.
 */
export function NewProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [shape, setShape] = useState<'BACKEND' | 'DEPLOYMENT' | 'BOTH'>(
    'DEPLOYMENT',
  );
  const [kind, setKind] = useState('backend');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const deploys = shape === 'DEPLOYMENT' || shape === 'BOTH';

  const create = () => {
    setError(null);
    startTransition(async () => {
      const result = await createProjectAction({
        name: name.trim(),
        type: deploys ? kind : 'backend',
        shape,
        deploymentOn: deploys,
      });
      if (result.error || !result.project) {
        setError(result.error ?? 'The project could not be created.');
        return;
      }
      setOpen(false);
      router.push(`/projects/${result.project.slug}`);
      router.refresh();
    });
  };

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        New project
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Make a project"
        description="A project is a directory for one application. Name it after the application it holds."
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={create}
              loading={pending}
              disabled={!name.trim()}
            >
              Create the project
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Input
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="acme-store"
            autoFocus
            hint="The application's name — it becomes the project's address."
          />

          <ChoiceGroup
            legend="What will this project do?"
            name="shape"
            value={shape}
            onChange={(value) =>
              setShape(value as 'BACKEND' | 'DEPLOYMENT' | 'BOTH')
            }
            options={[
              {
                value: 'BACKEND',
                title: 'Backend as a service',
                body: 'Data, users, files and realtime for an app. Powered by InstantDB.',
              },
              {
                value: 'DEPLOYMENT',
                title: 'Deployments',
                body: 'Build and run your application from git.',
              },
              {
                value: 'BOTH',
                title: 'Both',
                body: 'A backend, and the application that runs on it.',
              },
            ]}
          />

          {deploys ? (
            <ChoiceGroup
              legend="What are you deploying?"
              name="kind"
              value={kind}
              onChange={setKind}
              options={[
                {
                  value: 'backend',
                  title: 'A service or an API',
                  body: 'A server: Node, Python, Go.',
                },
                {
                  value: 'frontend',
                  title: 'A website or an app',
                  body: 'Something that is served as files.',
                },
              ]}
            />
          ) : null}

          {error ? <ErrorState message={error} /> : null}
        </div>
      </Dialog>
    </>
  );
}
