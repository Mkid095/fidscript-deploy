'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  onEnvVars,
  onSubdomain,
}: {
  plan: BuildPlan;
  envVars: Array<{ key: string; value: string }>;
  subdomain: string;
  onEnvVars: (next: Array<{ key: string; value: string }>) => void;
  onSubdomain: (next: string) => void;
}) {
  const set = (index: number, patch: Partial<{ key: string; value: string }>) => {
    onEnvVars(envVars.map((entry, position) => (position === index ? { ...entry, ...patch } : entry)));
  };

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 rounded-lg border border-rail bg-surface-2 p-3 text-xs">
        <Fact term="Framework" value={`${plan.frameworkLabel}${plan.frameworkVersion ? ` ${plan.frameworkVersion}` : ''}`} />
        <Fact term="Build" value={plan.buildCommand} />
        <Fact term="Start" value={plan.startCommand} />
        <Fact term="Port" value={String(plan.port)} />
      </dl>

      <Input
        label="Subdomain"
        hint="Optional. The deployment answers on this address under the platform's domain."
        value={subdomain}
        placeholder="store"
        onChange={(event) => onSubdomain(event.target.value)}
      />

      <div className="space-y-2">
        <p className="text-xs font-medium text-text-muted">Environment variables</p>
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
              onClick={() => onEnvVars(envVars.filter((_, position) => position !== index))}
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
