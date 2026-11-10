'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/feedback';
import { DeploymentSourceStep } from '@/components/project/deployment-source-step';
import {
  DeploymentConfigureStep,
  newEnvRow,
  type BuildOverrides,
  type EnvRow,
  type OverrideKey,
} from '@/components/project/deployment-configure-step';
import { DeploymentProgressStep } from '@/components/project/deployment-progress-step';
import {
  createDeploymentAction,
  detectBuildPlanAction,
  updateBuildConfigAction,
  type BuildPlan,
} from '@/app/(project)/projects/[projectId]/deployments/new/actions';

const STEPS = ['Source', 'Detect', 'Configure', 'Deploy'] as const;

/** The checks the platform runs while it reads a repository. */
const DETECT_STEPS = [
  'Connecting to GitHub',
  'Cloning the repository',
  'Reading package.json',
  'Detecting the framework',
  'Looking for .env.example',
];

const noOverrides: BuildOverrides = {
  install: false,
  build: false,
  start: false,
  port: false,
};
const noOverrideValues: Record<OverrideKey, string> = {
  install: '',
  build: '',
  start: '',
  port: '',
};

/**
 * A new deployment.
 *
 * Source, detect, configure, deploy — the four steps the guide names. The
 * repository is read, the framework is found, the variables are set, and
 * then the platform does the work while the page watches it. Every setting
 * the wizard shows is the platform's own: what was detected says so, and an
 * override is typed over it, never invented.
 */
export function DeploymentWizard({
  projectId,
  projectSlug,
  domains = [],
  liveDeploymentLabel,
}: {
  projectId: string;
  projectSlug: string;
  /** The project's own domains — one of them can answer for this deployment. */
  domains?: Array<{
    id: string;
    domain: string;
    dnsStatus: string;
    attached: boolean;
  }>;
  /** What is up right now, if anything. A new deployment replaces it. */
  liveDeploymentLabel?: string | null;
}) {
  const [step, setStep] = useState(0);
  const [gitUrl, setGitUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [plan, setPlan] = useState<BuildPlan | null>(null);
  const [envRows, setEnvRows] = useState<EnvRow[]>([newEnvRow()]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [subdomain, setSubdomain] = useState('');
  const [buildTarget, setBuildTarget] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<BuildOverrides>(noOverrides);
  const [overrideValues, setOverrideValues] = useState(noOverrideValues);
  const [domainId, setDomainId] = useState<string | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [pending, startTransition] = useTransition();
  const [detectStep, setDetectStep] = useState(0);
  const deployRef = useRef<(() => void) | undefined>(undefined);

  // The detection runs for real while the checklist animates: the ticks
  // keep their own time, and the plan's arrival ends the list wherever it
  // is — a fast repository is not made to wait for the theatre.
  useEffect(() => {
    if (step !== 1) return;
    if (detectStep >= DETECT_STEPS.length) return;
    const timer = setTimeout(() => setDetectStep((n) => n + 1), 520);
    return () => clearTimeout(timer);
  }, [step, detectStep]);

  // The detection reads the repository the step names — the one the person
  // pressed, when they pressed it, so a click on a repository goes straight
  // to the reading without a stop at the next button.
  const detect = (url = gitUrl, repoBranch = branch) => {
    setError(null);
    setDetectStep(0);
    setStep(1);
    startTransition(async () => {
      const result = await detectBuildPlanAction(projectId, {
        gitUrl: url,
        branch: repoBranch,
      });
      if (result.error || !result.plan) {
        setError(result.error ?? 'The repository could not be read.');
        setStep(0);
        return;
      }
      setPlan(result.plan);
      setSuggestions(result.plan.envSuggestions ?? []);
      // The detect list finishes its last tick before the configure step
      // opens, so the hand-over reads as one motion, not a cut.
      setDetectStep(DETECT_STEPS.length);
      setTimeout(() => setStep(2), 420);
    });
  };

  const deploy = () => {
    // A new deployment takes over the one that is up. The person has to
    // say so plainly when there is something to replace.
    if (liveDeploymentLabel && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const variables: Record<string, string> = {};
      for (const row of envRows) {
        if (row.key.trim()) variables[row.key.trim()] = row.value;
      }
      // The build's own settings are said before the deployment starts, so
      // the runner reads one config: the monorepo app, and the commands and
      // the port. A switch that is off sends an empty value — an override
      // that was set before is genuinely cleared, not silently kept.
      const configured = await updateBuildConfigAction(projectId, {
        ...(buildTarget ? { buildTarget } : {}),
        installCommand: overrides.install ? overrideValues.install : '',
        buildCommand: overrides.build ? overrideValues.build : '',
        startCommand: overrides.start ? overrideValues.start : '',
        port: overrides.port ? Number(overrideValues.port) || null : null,
      });
      if (configured.error) {
        setError(configured.error);
        return;
      }
      const result = await createDeploymentAction(projectId, {
        gitUrl,
        branch,
        envVars: variables,
        subdomain: domainId ? undefined : subdomain.trim() || undefined,
        domainId: domainId ?? undefined,
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
              {index < step ? '✓' : index + 1}
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
            onPick={(pick) => detect(pick.gitUrl, pick.branch)}
          />
          <Button
            variant="primary"
            onClick={() => detect()}
            loading={pending}
            disabled={!gitUrl.trim()}
          >
            Next — read the repository
          </Button>
        </>
      ) : null}

      {step === 1 ? (
        <DetectChecklist
          repoLabel={gitUrl}
          current={detectStep}
          failed={!!error}
        />
      ) : null}

      {step === 2 && plan ? (
        <DeploymentConfigureStep
          projectId={projectId}
          plan={plan}
          envRows={envRows}
          onEnvRows={setEnvRows}
          suggestions={suggestions}
          onSuggestionsUsed={() => setSuggestions([])}
          subdomain={subdomain}
          onSubdomain={setSubdomain}
          buildTarget={buildTarget}
          onBuildTarget={setBuildTarget}
          domains={domains}
          domainId={domainId}
          onDomainId={setDomainId}
          overrides={overrides}
          onOverrides={setOverrides}
          overrideValues={overrideValues}
          onOverrideValues={setOverrideValues}
          onDeploy={deploy}
          registerDeploy={(fn) => {
            deployRef.current = fn;
          }}
          onBack={() => setStep(0)}
          replaceWarning={
            liveDeploymentLabel ? (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  confirmReplace
                    ? 'border-danger/40 bg-danger/5 text-danger'
                    : 'border-warning/40 bg-warning/5 text-text'
                }`}
              >
                {confirmReplace ? (
                  <p>
                    This replaces{' '}
                    <span className="font-medium">{liveDeploymentLabel}</span> —
                    the live application comes down while the new one builds.
                    Press the button again to take it over.
                  </p>
                ) : (
                  <p>
                    <span className="font-medium">{liveDeploymentLabel}</span> is
                    up now. This deployment takes its place — one application
                    answers on the project&apos;s name at a time.
                  </p>
                )}
              </div>
            ) : null
          }
        />
      ) : null}

      {step === 3 && deploymentId ? (
        <DeploymentProgressStep
          projectId={projectId}
          projectSlug={projectSlug}
          deploymentId={deploymentId}
          deployLabel={confirmReplace ? `replacing ${liveDeploymentLabel}` : undefined}
          onRetry={deploy}
          remainingApps={(plan?.apps ?? []).filter(
            (app) => app.path !== buildTarget,
          )}
          onDeployAnother={(path) => {
            setBuildTarget(path);
            setDeploymentId(null);
            setSubdomain('');
            setOverrides(noOverrides);
            setOverrideValues(noOverrideValues);
            setStep(2);
          }}
        />
      ) : null}
    </div>
  );
}


/**
 * The reading of the repository, as a checklist.
 *
 * The steps are the platform's own work, named; the ticks keep their own
 * time and the real detection ends the list wherever it has got to.
 */
function DetectChecklist({
  repoLabel,
  current,
  failed,
}: {
  repoLabel: string;
  current: number;
  failed: boolean;
}) {
  return (
    <div className="rounded-lg border border-rail bg-surface p-5">
      <p className="text-sm font-medium text-text">Reading the repository</p>
      <p className="mt-0.5 truncate text-xs text-text-dim">{repoLabel}</p>
      <ul className="mt-4 space-y-2.5">
        {DETECT_STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2.5 text-sm">
            {index < current ? (
              <span className="text-success" aria-hidden>
                ✓
              </span>
            ) : index === current && !failed ? (
              <span
                className="inline-block size-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent"
                aria-hidden
              />
            ) : (
              <span className="size-2 rounded-full bg-surface-2" aria-hidden />
            )}
            <span
              className={
                index < current
                  ? 'text-text'
                  : index === current && !failed
                    ? 'text-text'
                    : 'text-text-dim'
              }
            >
              {label}
            </span>
          </li>
        ))}
      </ul>
      {failed ? (
        <p className="mt-3 text-xs text-danger">
          The repository could not be read — the error is above. Fix the
          address or the branch and try again.
        </p>
      ) : null}
    </div>
  );
}
