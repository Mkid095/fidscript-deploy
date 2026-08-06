// useNewDeploy — wizard state and handlers for the new deployment page

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { Project } from '@/types';
import type { BuildPlan } from './new-deploy-types';
import type { SourceType } from './new-deploy-utils';
import { parseEnvText, extractRepoInfo } from './new-deploy-utils';

interface UseNewDeployOptions {
  project: Project;
  getSdk: () => FidscriptSDK;
  onShowToast: (opts: { type: string; message: string }) => void;
  onDeploySuccess: (deploymentId?: string) => void;
}

export function useNewDeploy({ project, getSdk, onShowToast, onDeploySuccess }: UseNewDeployOptions) {
  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [sourceType, setSourceType] = useState<SourceType>('git');
  const [gitUrl, setGitUrl] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<{ full_name: string } | null>(null);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [manualGitUrl, setManualGitUrl] = useState('');
  const [dockerfilePath, setDockerfilePath] = useState('');
  const [credentials, setCredentials] = useState('');
  const [envText, setEnvText] = useState('');
  const [autoDeploy, setAutoDeploy] = useState(true);
  const [buildPlan, setBuildPlan] = useState<BuildPlan | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [uploadedArchive, setUploadedArchive] = useState<{ bucketId: string; objectKey: string } | null>(null);
  const [subdomain, setSubdomain] = useState('');
  const [availableDomains, setAvailableDomains] = useState<Array<{ id: string; domain: string }>>([]);
  const [assignedDomainId, setAssignedDomainId] = useState<string | null>(null);

  // Load project domains once the wizard mounts so the subdomain picker can offer them.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sdk = getSdk();
        const list = await sdk.domains.list(project.id);
        if (cancelled) return;
        setAvailableDomains(
          (list as Array<{ id: string; domain: string }>).map(d => ({ id: d.id, domain: d.domain })),
        );
      } catch { /* non-fatal */ }
    })();
    return () => { cancelled = true; };
  }, [project.id, getSdk]);

  const effectiveBranch = selectedRepo ? selectedBranch : (manualGitUrl ? 'main' : '');
  const computedGitUrl = selectedRepo ? `https://github.com/${selectedRepo.full_name}.git` : manualGitUrl.trim();
  const repoName = selectedRepo?.full_name ?? extractRepoInfo(computedGitUrl).repo;
  const parsedEnvVars = useMemo(() => parseEnvText(envText), [envText]);

  const canContinue = useMemo(() => {
    if (stepIndex === 0) return true;
    if (stepIndex === 1) {
      if (sourceType === 'git') return !!computedGitUrl;
      return !!uploadedArchive;
    }
    return true;
  }, [stepIndex, sourceType, computedGitUrl, uploadedArchive]);

  const continueStep = useCallback(() => {
    setCompleted(prev => new Set(prev).add(stepIndex));
    setStepIndex(i => Math.min(i + 1, 3));
  }, [stepIndex]);

  const back = useCallback(() => setStepIndex(i => Math.max(i - 1, 0)), []);

  const runDetection = useCallback(async () => {
    if (!computedGitUrl || buildPlan || detecting) return;
    setDetecting(true); setDetectError(null);
    try {
      const plan = await getSdk().deployments.detect(project.id, {
        gitUrl: computedGitUrl, branch: effectiveBranch || 'main',
        ...(credentials.trim() && { credentials: credentials.trim() }),
      });
      setBuildPlan(plan);
    } catch (err) {
      setDetectError(err instanceof Error ? err.message : 'Detection failed');
    } finally {
      setDetecting(false);
    }
  }, [project.id, computedGitUrl, effectiveBranch, credentials, buildPlan, detecting, getSdk]);

  const deploy = useCallback(async () => {
    setSubmitting(true);
    try {
      const sdk = getSdk();
      const envVars = Object.keys(parsedEnvVars).length > 0 ? parsedEnvVars : undefined;
      let deploymentId: string | undefined;
      if (sourceType === 'git') {
        const created = await sdk.deployments.create(project.id, {
          source: { type: 'git', git: { url: computedGitUrl, branch: effectiveBranch || 'main', ...(dockerfilePath.trim() && { dockerfilePath: dockerfilePath.trim() }), ...(credentials.trim() && { credentials: credentials.trim() }) } },
          branch: effectiveBranch || 'main',
          ...(envVars && { envVars }),
          ...(subdomain.trim() && { subdomain: subdomain.trim() }),
          ...(assignedDomainId && { domainId: assignedDomainId }),
        });
        deploymentId = (created as { id?: string }).id;
      } else if (uploadedArchive) {
        const created = await sdk.deployments.create(project.id, {
          source: { type: 'archive', archive: { bucketId: uploadedArchive.bucketId, objectKey: uploadedArchive.objectKey, ...(dockerfilePath.trim() && { dockerfilePath: dockerfilePath.trim() }) } },
          ...(envVars && { envVars }),
          ...(subdomain.trim() && { subdomain: subdomain.trim() }),
          ...(assignedDomainId && { domainId: assignedDomainId }),
        });
        deploymentId = (created as { id?: string }).id;
      }
      onShowToast({ type: 'success', message: 'Deployment queued — building now.' });
      onDeploySuccess(deploymentId);
    } catch (err) {
      onShowToast({ type: 'error', message: err instanceof Error ? err.message : 'Deployment failed' });
    } finally {
      setSubmitting(false);
    }
  }, [sourceType, computedGitUrl, effectiveBranch, dockerfilePath, credentials, parsedEnvVars, uploadedArchive, subdomain, assignedDomainId, project.id, getSdk, onShowToast, onDeploySuccess]);

  return {
    stepIndex, completed, sourceType, gitUrl: computedGitUrl, selectedRepo, selectedBranch,
    manualGitUrl, dockerfilePath, credentials, envText, autoDeploy, buildPlan,
    detecting, detectError, showAdvanced, submitting,
    archiveFile, uploadedArchive,
    subdomain, availableDomains, assignedDomainId,
    effectiveBranch, repoName, parsedEnvVars, canContinue,
    setSourceType, setSelectedRepo, setSelectedBranch, setManualGitUrl,
    setDockerfilePath, setCredentials, setEnvText, setAutoDeploy, setBuildPlan,
    setShowAdvanced, setArchiveFile, setUploadedArchive,
    setSubdomain, setAssignedDomainId,
    continueStep, back, runDetection, deploy,
  };
}
