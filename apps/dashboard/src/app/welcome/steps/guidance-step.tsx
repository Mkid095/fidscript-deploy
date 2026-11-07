'use client';

import { Button, Card } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Rocket01Icon, Database01Icon, Key01Icon } from '@hugeicons/core-free-icons';
import type { Onboarding } from '../hooks/use-onboarding';

/**
 * Step four — what to do next.
 *
 * The project console is a big place to land in. These are the three things
 * that matter first, in the order they usually do.
 */
export function GuidanceStep({
  onboarding,
  onFinish,
}: {
  onboarding: Onboarding;
  onFinish: () => void;
}) {
  const slug = onboarding.draft.projectSlug ?? onboarding.existingProjects[0]?.slug;
  const base = slug ? `/projects/${slug}` : '/projects';

  const nexts = [
    {
      icon: Rocket01Icon,
      title: 'Deploy something',
      body: 'Point the platform at a repository. It builds it, runs it, and gives you a URL.',
      href: '/deployments/new',
    },
    {
      icon: Database01Icon,
      title: 'Add a database',
      body: 'A Postgres database for this project, with a connection string and a console.',
      href: `${base}/databases`,
    },
    {
      icon: Key01Icon,
      title: 'Turn on two-factor',
      body: 'A code from your phone when you sign in. It takes a minute, and it is worth it.',
      href: '/settings',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">
          Three things to do next
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          You are in the project console now. These are the three that matter.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {nexts.map((item) => (
          <Card key={item.title} className="border border-[var(--rail)] p-4">
            <div className="flex items-start gap-3">
              <HugeiconsIcon icon={item.icon} size={18} className="text-[var(--accent)] mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[var(--text)]">{item.title}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{item.body}</p>
                <a
                  href={item.href}
                  className="mt-2 inline-block text-xs text-[var(--accent)] hover:underline"
                >
                  Open it
                </a>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={onFinish} loading={onboarding.saving}>
          Take me to my project
        </Button>
      </div>
    </div>
  );
}
