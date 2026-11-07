'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Card, SectionHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import type { Application } from '@/lib/api/types';
import type { Discovery, InstallationStatus, StepValidation } from '@/lib/api/installation';
import { SetupAccountForm } from '@/components/setup/setup-account-form';
import { SetupApplicationsStep } from '@/components/setup/setup-applications-step';

const STEPS = ['Discover', 'Validate', 'Account', 'Applications', 'Install', 'Verify', 'Done'];

/**
 * The setup.
 *
 * One wizard: what the server is, what would block it, who the
 * administrator is, what this platform provides, the install, the check,
 * and the first project.
 */
export function SetupWizard({
  discovery,
  validations,
  status,
  applications,
}: {
  discovery: Discovery | null;
  validations: StepValidation[];
  status: InstallationStatus | null;
  applications: Application[];
}) {
  const configured = status?.lifecycle === 'CONFIGURED';
  const [step, setStep] = useState(configured ? 3 : 0);
  const [chosen, setChosen] = useState<string[]>([]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-text">Set up FIDScript</h1>
        <p className="mt-1 text-sm text-text-muted">
          {configured
            ? 'This platform is already set up. What is left is what it provides.'
            : 'One wizard, from an empty machine to a platform that serves.'}
        </p>
      </header>

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
        <section>
          <SectionHeader title="What this server is" />
          <Card className="divide-y divide-rail">
            <Fact term="Server" value={discovery?.serverIp ?? 'Not known'} />
            <Fact term="Docker" value={discovery?.dockerAvailable ? 'Available' : 'Not available'} />
            <Fact term="Traefik" value={discovery?.traefikConfigured ? 'Configured' : 'Not configured'} />
            <Fact term="Certificate" value={discovery?.existingCertificateFound ? 'Found' : 'None'} />
            <Fact
              term="Cloudflare"
              value={
                discovery?.cloudflareOAuthConfigured
                  ? 'OAuth configured'
                  : discovery?.cloudflareTokenFound
                    ? 'A token was found'
                    : 'Not connected'
              }
            />
            <Fact
              term="Already installed"
              value={
                discovery?.existingInstallation
                  ? `Yes — ${discovery.existingInstallation.projectCount} project(s), ${discovery.existingInstallation.userCount} account(s)`
                  : 'No'
              }
            />
          </Card>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={() => setStep(1)}>
              Next
            </Button>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section>
          <SectionHeader
            title="What would block it"
            description="Each step that has to pass before the platform is written."
          />
          <Card className="divide-y divide-rail">
            {validations.length === 0 ? (
              <p className="px-4 py-3 text-sm text-text-muted">
                The platform did not answer with its checks.
              </p>
            ) : (
              validations.map((validation) => (
                <div key={validation.step} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-text capitalize">{validation.step}</p>
                    {validation.issues.length > 0 ? (
                      <p className="truncate text-xs text-text-dim">
                        {validation.issues.join(', ')}
                      </p>
                    ) : null}
                  </div>
                  <Badge tone={validation.valid ? 'success' : 'warning'}>
                    {validation.valid ? 'passes' : 'blocked'}
                  </Badge>
                </div>
              ))
            )}
          </Card>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button variant="primary" onClick={() => setStep(2)}>
              Next
            </Button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <SetupAccountForm
          discovery={discovery}
          onDone={() => setStep(3)}
        />
      ) : null}

      {step === 3 ? (
        <SetupApplicationsStep
          applications={applications}
          chosen={chosen}
          onChosen={setChosen}
          onNext={() => setStep(4)}
          onBack={configured ? undefined : () => setStep(2)}
        />
      ) : null}

      {step === 4 ? (
        <section>
          <SectionHeader title="Install" description="One row per application, as it goes." />
          <Card className="divide-y divide-rail">
            {chosen.length === 0 ? (
              <p className="px-4 py-3 text-sm text-text-muted">
                Nothing was chosen to install. Everything already here stays.
              </p>
            ) : (
              chosen.map((id) => {
                const application = applications.find((candidate) => candidate.id === id);
                return (
                  <div key={id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                    <span className="text-sm text-text">{application?.title ?? id}</span>
                    <Badge tone="info">installing</Badge>
                  </div>
                );
              })
            )}
          </Card>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button variant="primary" onClick={() => setStep(5)}>
              Next
            </Button>
          </div>
        </section>
      ) : null}

      {step === 5 ? (
        <section>
          <SectionHeader title="Verify" description="Every application, and where it stands." />
          <Card className="divide-y divide-rail">
            {applications.map((application) => (
              <div key={application.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">{application.title}</p>
                  <p className="truncate text-xs text-text-dim">{application.summary}</p>
                </div>
                <Badge tone={application.installed ? 'success' : 'warning'}>
                  {application.installed ? 'healthy' : 'not installed'}
                </Badge>
              </div>
            ))}
          </Card>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button variant="primary" onClick={() => setStep(6)}>
              Next
            </Button>
          </div>
        </section>
      ) : null}

      {step === 6 ? (
        <section>
          <SectionHeader title="Done" />
          <Card className="p-6 text-center">
            <p className="text-sm text-text">The platform is ready.</p>
            <p className="mt-1 text-xs text-text-muted">
              The first thing it does is hold a project.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/projects">
                <Button variant="primary">Create a project</Button>
              </Link>
              <Link href="/overview">
                <Button variant="ghost">Go to the overview</Button>
              </Link>
            </div>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <span className="text-sm text-text-muted">{term}</span>
      <span className="truncate text-sm text-text">{value}</span>
    </div>
  );
}
