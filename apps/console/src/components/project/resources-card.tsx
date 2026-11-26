'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import type { BuildConfig } from '@/lib/api/resources';
import {
  applyBuildConfigAction,
  saveBuildResourcesAction,
} from '@/app/(project)/projects/[projectId]/deployments/actions';

/**
 * The application's resource ceilings.
 *
 * The host runs the platform and every project on it, so each application's
 * container has a ceiling: how much memory it may take and how much CPU it
 * may claim. The values here are the project's own; when a ceiling is unset
 * the platform's own default stands (512 MB, one core). A saved change is
 * fixed into the container the next time it is run — or re-run it right now
 * with "Apply now", which starts the same image again under the new ceiling.
 */
export function ResourcesCard({
  projectId,
  buildConfig,
}: {
  projectId: string;
  buildConfig: BuildConfig | null;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const defaultMemory = 512;
  const defaultCpu = 1000; // millicpus

  const [memory, setMemory] = useState<string>(
    buildConfig?.memoryLimitMb ? String(buildConfig.memoryLimitMb) : '',
  );
  const [cpu, setCpu] = useState<string>(
    buildConfig?.cpuLimitMillicpu
      ? String(buildConfig.cpuLimitMillicpu / 1000)
      : '',
  );

  const save = () => {
    const memoryMb = memory.trim() ? Number(memory) : undefined;
    const cpuMillicpu = cpu.trim() ? Math.round(Number(cpu) * 1000) : undefined;
    startTransition(async () => {
      const result = await saveBuildResourcesAction(projectId, {
        memoryLimitMb: memoryMb,
        cpuLimitMillicpu: cpuMillicpu,
      });
      if (result.error) toast.error('That did not save', result.error);
      else toast.success('The ceilings were saved.', 'They bind the next run.');
    });
  };

  const applyNow = () => {
    startTransition(async () => {
      const result = await applyBuildConfigAction(projectId);
      if (result.error) toast.error('It did not come back up', result.error);
      else
        toast.success(
          'Re-run under the new ceilings',
          'The live container was started again with the same image.',
        );
    });
  };

  return (
    <Card className="mb-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-text">Resources</p>
          <p className="mt-0.5 text-xs text-text-dim">
            The container&rsquo;s ceilings. The host runs every project on it, so
            an application gets a ceiling, not a promise.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Input
          label="Memory limit"
          hint={
            memory.trim()
              ? 'What this container may take'
              : `Unset — the platform default, ${defaultMemory} MB`
          }
          type="number"
          min={128}
          max={8192}
          step={128}
          placeholder={String(defaultMemory)}
          value={memory}
          onChange={(event) => setMemory(event.target.value)}
          className="w-full"
        />
        <Input
          label="CPU limit"
          hint={
            cpu.trim()
              ? 'Cores the container may use'
              : `Unset — the platform default, ${defaultCpu / 1000} core`
          }
          type="number"
          min={0.05}
          max={8}
          step={0.05}
          placeholder={String(defaultCpu / 1000)}
          value={cpu}
          onChange={(event) => setCpu(event.target.value)}
          className="w-full"
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-text-dim">
        The ceilings are set on the container when it starts, so a saved
        change binds the next deploy. Apply now starts the running image again
        under the new ceiling — the same version, a new envelope.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-rail-light pt-3">
        <Button
          variant="primary"
          size="sm"
          onClick={save}
          loading={pending}
          disabled={pending}
        >
          Save the ceilings
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={applyNow}
          disabled={pending}
        >
          Apply now
        </Button>
      </div>
    </Card>
  );
}
