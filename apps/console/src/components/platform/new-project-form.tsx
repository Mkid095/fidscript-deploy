'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { createProjectAction } from '@/app/(platform)/projects/actions';
import type { Project, ProjectShape } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { ChoiceGroup, Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/feedback';

/**
 * Creating a project.
 *
 * The first question is not the name — it is **what the project is for**,
 * because everything the project's menu shows afterwards is derived from the
 * answer.
 */
const SHAPES = [
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
];

const KINDS = [
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
];

export function NewProjectForm({
  onCreated,
  redirectOnCreate = true,
}: {
  /** Called with the project that was made. */
  onCreated?: (project: Project) => void;
  /** Whether to open the project afterwards. The welcome flow does not. */
  redirectOnCreate?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [shape, setShape] = useState<ProjectShape>('DEPLOYMENT');
  const [kind, setKind] = useState('backend');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const deploys = shape === 'DEPLOYMENT' || shape === 'BOTH';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('The project needs a name.');
      return;
    }

    setSubmitting(true);
    const result = await createProjectAction({
      name: name.trim(),
      type: deploys ? kind : 'backend',
      shape,
      deploymentOn: deploys,
    });
    setSubmitting(false);

    if (!result.project) {
      setError(result.error ?? 'The project could not be created.');
      return;
    }
    onCreated?.(result.project);
    if (!onCreated || redirectOnCreate) {
      router.push(`/projects/${result.project.slug}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Input
        label="Project name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="acme-store"
        autoFocus
        required
      />

      <ChoiceGroup
        legend="What will this project do?"
        name="shape"
        value={shape}
        onChange={(value) => setShape(value as ProjectShape)}
        options={SHAPES}
      />

      {deploys ? (
        <ChoiceGroup
          legend="What are you deploying?"
          name="kind"
          value={kind}
          onChange={setKind}
          options={KINDS}
        />
      ) : null}

      {error ? <ErrorState message={error} /> : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" variant="primary" loading={submitting}>
          Create the project
        </Button>
      </div>
    </form>
  );
}
