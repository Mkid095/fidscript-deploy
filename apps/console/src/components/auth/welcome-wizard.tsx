'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/feedback';
import { NewProjectForm } from '@/components/platform/new-project-form';
import type { Project } from '@/lib/api/types';

import {
  completeOnboardingAction,
  setNameAction,
} from '@/app/(auth)/welcome/actions';

/**
 * The first-time journey.
 *
 * Four steps: what the platform is, what to call the person, the first
 * project, and what to do next. It ends on the project's overview — never
 * on a blank page.
 */
export function WelcomeWizard({ name }: { name: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [personName, setPersonName] = useState(name ?? '');
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The journey is in progress. The server page checks this cookie before it
  // decides the person is finished — without it, the project made in step
  // three would look like somebody else's project and send them away.
  const markInProgress = () => {
    document.cookie = 'fidscript_welcome=1; path=/; max-age=3600; samesite=lax';
  };

  const saveName = () => {
    setError(null);
    startTransition(async () => {
      const result = await setNameAction(personName);
      if (result.error) {
        setError(result.error);
        return;
      }
      // The journey is under way from here: the project made in the third
      // step must not look like somebody else's project and send the person
      // away. The cookie is set **before** the project is made, because the
      // page is re-rendered the moment the project is.
      markInProgress();
      setStep(2);
    });
  };

  const finish = () => {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboardingAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      document.cookie = 'fidscript_welcome=; path=/; max-age=0; samesite=lax';
      router.push(`/projects/${project?.slug}/overview`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Steps current={step} />

      {step === 0 ? (
        <div className="space-y-5">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-text">
              What FIDScript is
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              It is one machine that runs the parts of an application that are not the
              application: the data, the mail, the messages, the packages.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              You bring the code; it runs it, keeps it, and gives it a place on the
              internet.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              Everything here belongs to a project, and a project belongs to you.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                startTransition(async () => {
                  await completeOnboardingAction();
                  router.push('/overview');
                });
              }}
            >
              Skip this
            </Button>
            <Button variant="primary" onClick={() => setStep(1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-5">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-text">What to call you</h1>
            <p className="mt-1 text-sm text-text-muted">
              It is shown beside everything you do on this platform.
            </p>
          </div>
          <Input
            label="Your name"
            value={personName}
            onChange={(event) => setPersonName(event.target.value)}
            autoFocus
          />
          {error ? <ErrorState message={error} /> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button variant="primary" onClick={saveName} loading={pending}>
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-5">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-text">
              Your first project
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              What it is decides what it has. You can change it later.
            </p>
          </div>
          <NewProjectForm
            onCreated={(created) => {
              setProject(created);
              setStep(3);
            }}
            redirectOnCreate={false}
          />
        </div>
      ) : null}

      {step === 3 && project ? (
        <div className="space-y-5">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-text">
              Three things to do next
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              {project.name} is ready. This is where to go from here.
            </p>
          </div>
          <ol className="space-y-2 text-sm text-text-muted">
            <li>· Open the overview — it says what the project has and what to do next.</li>
            <li>· Connect a domain, so the project answers somewhere of your own.</li>
            <li>· Deploy something, or give the project a backend.</li>
          </ol>
          {error ? <ErrorState message={error} /> : null}
          <div className="flex justify-end">
            <Button variant="primary" onClick={finish} loading={pending}>
              Open the project
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const STEP_LABELS = ['The platform', 'You', 'A project', 'Next'];

function Steps({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEP_LABELS.map((label, index) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`flex size-5 items-center justify-center rounded-full border text-[10px] ${
              index <= current
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-rail text-text-dim'
            }`}
          >
            {index + 1}
          </span>
          <span className={index === current ? 'text-text' : 'text-text-dim'}>{label}</span>
          {index < STEP_LABELS.length - 1 ? <span className="text-text-dim">·</span> : null}
        </li>
      ))}
    </ol>
  );
}
