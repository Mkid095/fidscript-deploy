'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/feedback';
import { SetupDomainForm } from '@/components/setup/setup-domain-form';
import { SetupAccountStep } from '@/components/setup/setup-account-step';
import { SetupApplicationsStep } from '@/components/setup/setup-applications-step';
import { SetupInstallStep } from '@/components/setup/setup-install-step';
import { configurePlatformAction } from '@/app/(setup)/setup/actions';

const STEPS = ['The domain', 'The administrator', 'The applications', 'The install', 'Done'];

/**
 * The setup.
 *
 * The same order the installer asks in: the domain, the administrator, the
 * applications, and then it is done — with the domain's records written by
 * the platform when a Cloudflare token was given.
 */
export function SetupWizard({
  serverIp,
  configured,
  applications,
}: {
  serverIp: string;
  configured: boolean;
  applications: Array<{ id: string; title: string; summary: string; installed: boolean }>;
}) {
  const [step, setStep] = useState(configured ? 3 : 0);
  const [values, setValues] = useState({
    domain: '',
    cloudflareToken: '',
    setupToken: '',
    email: '',
    password: '',
  });
  const [operationId, setOperationId] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (next: Partial<typeof values>) => setValues({ ...values, ...next });

  const configure = () => {
    setError(null);
    startTransition(async () => {
      const result = await configurePlatformAction(
        {
          platformName: 'FIDScript',
          platformDomain: values.domain.trim().toLowerCase(),
          serverIp,
          adminEmail: values.email.trim(),
          authMethod: 'PASSWORD',
          adminPassword: values.password,
          ...(values.cloudflareToken.trim()
            ? { cloudflareApiToken: values.cloudflareToken.trim() }
            : {}),
          dnsMode: values.cloudflareToken.trim() ? 'cloudflare_auto' : 'manual',
        },
        values.setupToken,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.operationId) {
        setOperationId(result.operationId);
        setStep(3);
      }
    });
  };

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center gap-2 text-xs">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex size-5 items-center justify-center rounded-full border text-[10px] ${
                index <= step
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-rail text-text-dim'
              }`}
            >
              {index + 1}
            </span>
            <span className={index === step ? 'text-text' : 'text-text-dim'}>{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <>
          <SetupDomainForm
            domain={values.domain}
            cloudflareToken={values.cloudflareToken}
            setupToken={values.setupToken}
            onChange={set}
          />
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => setStep(1)}
              disabled={!values.domain.trim() || !values.setupToken.trim()}
            >
              Next
            </Button>
          </div>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <SetupAccountStep email={values.email} onChange={set} />
          {error ? <ErrorState message={error} /> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button
              variant="primary"
              onClick={configure}
              loading={pending}
              disabled={!values.email.trim() || values.password.length < 12}
            >
              Configure the platform
            </Button>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <SetupApplicationsStep
          applications={applications}
          chosen={chosen}
          onChosen={setChosen}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      ) : null}

      {step === 3 && operationId ? (
        <>
          <SetupInstallStep operationId={operationId} />
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setStep(4)}>
              Next
            </Button>
          </div>
        </>
      ) : null}

      {step === 4 ? (
        <Card className="max-w-xl space-y-3 p-6 text-center">
          <p className="text-sm font-medium text-text">The platform is ready.</p>
          <p className="text-xs text-text-muted">
            The first thing it does is hold a project.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Link href="/projects">
              <Button variant="primary" size="sm">
                Create a project
              </Button>
            </Link>
            <Link href="/overview">
              <Button variant="ghost" size="sm">
                Go to the overview
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
