'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/feedback';
import { DeploymentSourceStep } from '@/components/project/deployment-source-step';
import { DeploymentConfigureStep } from '@/components/project/deployment-configure-step';
import { DeploymentProgressStep } from '@/components/project/deployment-progress-step';
import {
  createDeploymentAction,
  detectBuildPlanAction,
  updateBuildTargetAction,
  type BuildPlan,
} from '@/app/(project)/projects/[projectId]/deployments/new/actions';

const STEPS = ['Source', 'Detect', 'Configure', 'Deploy'] as const;

/**
 * A new deployment.
 *
 * Source, detect, configure, deploy — the four steps the guide names. The
 * repository is read, the framework is found, the variables are set, and
 * then the platform does the work while the page watches it.
 */
export function DeploymentWizard({
  projectId,
  projectSlug,
}: {
  projectId: string;
  projectSlug: string;
}) {
  const [step, setStep] = useState(0);
  const [gitUrl, setGitUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [plan, setPlan] = useState<BuildPlan | null>(null);
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>(
    [],
  );
  const [subdomain, setSubdomain] = useState('');
  const [buildTarget, setBuildTarget] = useState<string | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const detect = () => {
    setError(null);
    startTransition(async () => {
      const result = await detectBuildPlanAction(projectId, { gitUrl, branch });
      if (result.error || !result.plan) {
        setError(result.error ?? 'The repository could not be read.');
        return;
      }
      setPlan(result.plan);
      setStep(2);
    });
  };

  const deploy = () => {
    setError(null);
    startTransition(async () => {
      const variables: Record<string, string> = {};
      for (const entry of envVars) {
        if (entry.key.trim()) variables[entry.key.trim()] = entry.value;
      }
      // A monorepo app is named before it is built: the platform builds the
      // directory this deployment said it is.
      if (buildTarget) {
        const configured = await updateBuildTargetAction(
          projectId,
          buildTarget,
        );
        if (configured.error) {
          setError(configured.error);
          return;
        }
      }
      const result = await createDeploymentAction(projectId, {
        gitUrl,
        branch,
        envVars: variables,
        subdomain: subdomain.trim() || undefined,
      });
      if (result.error || !result.deploymentId) {
        setError(result.error ?? 'The deployment did not start.');
        return;
      }
      setDeploymentId(result.deploymentId);
      setStep(3);
    });
  };

  return (
    <div className="space-y-6">
      <ol className="flex items-center gap-2 text-xs">
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
            <span className={index === step ? 'text-text' : 'text-text-dim'}>
              {label}
            </span>
            {index < STEPS.length - 1 ? (
              <span className="text-text-dim">·</span>
            ) : null}
          </li>
        ))}
      </ol>

      {error ? <ErrorState message={error} /> : null}

      {step === 0 ? (
        <>
          <DeploymentSourceStep
            gitUrl={gitUrl}
            branch={branch}
            onChange={(next) => {
              setGitUrl(next.gitUrl);
              setBranch(next.branch);
            }}
          />
          <Button
            variant="primary"
            onClick={detect}
            loading={pending}
            disabled={!gitUrl.trim()}
          >
            Next — read the repository
          </Button>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <p className="text-sm text-text-muted">Reading the repository…</p>
          <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
            Back
          </Button>
        </>
      ) : null}

      {step === 2 && plan ? (
        <>
          <DeploymentConfigureStep
            plan={plan}
            envVars={envVars}
            subdomain={subdomain}
            buildTarget={buildTarget}
            onBuildTarget={setBuildTarget}
            onEnvVars={setEnvVars}
            onSubdomain={setSubdomain}
          />
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={deploy} loading={pending}>
              Deploy
            </Button>
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
          </div>
        </>
      ) : null}

      {step === 3 && deploymentId ? (
        <DeploymentProgressStep
          projectId={projectId}
          projectSlug={projectSlug}
          deploymentId={deploymentId}
          remainingApps={(plan?.apps ?? []).filter(
            (app) => app.path !== buildTarget,
          )}
          onDeployAnother={(path) => {
            setBuildTarget(path);
            setDeploymentId(null);
            setSubdomain('');
            setStep(2);
          }}
        />
      ) : null}
    </div>
  );
}
