'use client';

import { Button, Input, Select } from '@fidscript/ui';
import type { Onboarding } from '../hooks/use-onboarding';

/**
 * Step three — the first project.
 *
 * A project is where everything lives: the applications, the databases, the
 * domains. An account that already has one is not asked to make another.
 */
export function ProjectStep({
  onboarding,
  onNext,
  onBack,
}: {
  onboarding: Onboarding;
  onNext: () => void;
  onBack: () => void;
}) {
  const { draft, existingProjects, setDraft, createProject, saving, error } = onboarding;
  const hasProjects = existingProjects.length > 0;

  async function handleCreate() {
    const project = await createProject();
    if (project) onNext();
  }

  if (hasProjects) {
    const first = existingProjects[0];
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">
            You already have a project
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            We made one when you signed up. Use it, or make another for something else.
          </p>
        </div>

        <ul className="flex flex-col gap-2">
          {existingProjects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => { setDraft({ projectSlug: project.slug }); onNext(); }}
                className="w-full flex items-center justify-between rounded-lg border border-[var(--rail)] bg-[var(--surface)] px-4 py-3 text-left hover:border-[var(--rail-light)] transition-colors"
              >
                <span>
                  <span className="block text-sm text-[var(--text)]">{project.name}</span>
                  <span className="block text-xs text-[var(--text-dim)]">{project.slug}</span>
                </span>
                <span className="text-xs text-[var(--text-muted)]">Use this</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={onBack}>Back</Button>
          <Button variant="secondary" onClick={() => setDraft({ projectName: '' })}>
            Make another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">
          Your first project
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          A project holds the applications, the databases and the domains for one thing you are
          building. You can make more later.
        </p>
      </div>

      <Input
        label="Project name"
        value={draft.projectName}
        onChange={(e) => setDraft({ projectName: e.target.value })}
        placeholder="My first project"
      />

      <Select
        label="What kind of project is it?"
        value={draft.projectType}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          setDraft({ projectType: e.target.value as 'backend' | 'frontend' })}
        options={[
          { value: 'backend', label: 'A service or an API' },
          { value: 'frontend', label: 'A website or an app' },
        ]}
      />

      {error && <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button
          variant="primary"
          onClick={handleCreate}
          disabled={!draft.projectName.trim() || saving}
          loading={saving}
        >
          {saving ? 'Creating…' : 'Create it'}
        </Button>
      </div>
    </div>
  );
}
