'use client';

import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import type { BuildPlan } from '@/app/(project)/projects/[projectId]/deployments/new/actions';

/**
 * What was detected, and what to send with the deployment.
 *
 * The build plan is the platform's — the framework, the build command and
 * the port it found in the repository.
 */
export function DeploymentConfigureStep({
  plan,
  envVars,
  subdomain,
  buildTarget,
  onBuildTarget,
  domains = [],
  domainId,
  onDomainId,
  onEnvVars,
  onSubdomain,
}: {
  plan: BuildPlan;
  envVars: Array<{ key: string; value: string }>;
  subdomain: string;
  /** The monorepo app this deployment builds, when the repository holds several. */
  buildTarget: string | null;
  onBuildTarget: (next: string | null) => void;
  /** The project's own domains — a name that is already the project's can answer here. */
  domains?: Array<{
    id: string;
    domain: string;
    dnsStatus: string;
    attached: boolean;
  }>;
  domainId: string | null;
  onDomainId: (next: string | null) => void;
  onEnvVars: (next: Array<{ key: string; value: string }>) => void;
  onSubdomain: (next: string) => void;
}) {
  const set = (
    index: number,
    patch: Partial<{ key: string; value: string }>,
  ) => {
    onEnvVars(
      envVars.map((entry, position) =>
        position === index ? { ...entry, ...patch } : entry,
      ),
    );
  };

  const apps = plan.apps ?? [];

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 rounded-lg border border-rail bg-surface-2 p-3 text-xs">
        <Fact
          term="Framework"
          value={`${plan.frameworkLabel}${plan.frameworkVersion ? ` ${plan.frameworkVersion}` : ''}`}
        />
        <Fact term="Build" value={plan.buildCommand} />
        <Fact term="Start" value={plan.startCommand} />
        <Fact term="Port" value={String(plan.port)} />
      </dl>

      {apps.length > 1 ? (
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-text-muted">
            This repository holds {apps.length} applications — which one is this
            deployment?
          </legend>
          {apps.map((app) => (
            <label
              key={app.path}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${
                (buildTarget ?? '') === app.path
                  ? 'border-accent bg-accent/5'
                  : 'border-rail bg-surface-2'
              }`}
            >
              <input
                type="radio"
                name="build-target"
                className="mt-0.5 size-3.5 accent-[var(--accent)]"
                checked={(buildTarget ?? '') === app.path}
                onChange={() => onBuildTarget(app.path)}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm text-text">
                  {app.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-text-dim">
                  {app.frameworkLabel} · {app.path}
                </span>
              </span>
            </label>
          ))}
          <p className="text-xs text-text-dim">
            The others stay available after this deployment — the finish screen
            offers them.
          </p>
        </fieldset>
      ) : null}

      {domains.filter((entry) => !entry.attached).length > 0 ? (
        <Select
          label="A name of the project's"
          hint="Optional. A domain that was added to this project — its records already written — answers for this deployment. The platform secures it with a certificate once the deployment is healthy."
          value={domainId ?? ''}
          onChange={(event) => onDomainId(event.target.value || null)}
          options={[
            {
              value: '',
              label: 'None — the deployment’s own address is enough',
            },
            ...domains
              .filter((entry) => !entry.attached)
              .map((entry) => ({ value: entry.id, label: entry.domain })),
          ]}
        />
      ) : null}

      {!domainId ? (
        <Input
          label="Subdomain"
          hint="Optional. The deployment answers on this address under the platform's domain."
          value={subdomain}
          placeholder="store"
          onChange={(event) => onSubdomain(event.target.value)}
        />
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-medium text-text-muted">
          Environment variables
        </p>
        {envVars.map((entry, index) => (
          <div key={index} className="flex items-end gap-2">
            <Input
              label="Name"
              value={entry.key}
              onChange={(event) => set(index, { key: event.target.value })}
              className="flex-1"
            />
            <Input
              label="Value"
              value={entry.value}
              onChange={(event) => set(index, { value: event.target.value })}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onEnvVars(envVars.filter((_, position) => position !== index))
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEnvVars([...envVars, { key: '', value: '' }])}
        >
          Add a variable
        </Button>
      </div>
    </div>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-text-dim">{term}</dt>
      <dd className="mt-0.5 truncate font-mono text-text">{value}</dd>
    </div>
  );
}
