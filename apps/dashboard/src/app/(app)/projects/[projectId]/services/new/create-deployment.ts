// createDeployment — issue a new deployment via the SDK.
//
// Supports both source modes:
//   - git:     branch + url + optional credentials / dockerfile
//   - archive: pre-uploaded object in a storage bucket
//
// After a successful create, if the user picked a custom subdomain and
// isn't reusing an existing Domain, we also register the
// {subdomain}.apps.{platformDomain} hostname as a Domain row so the
// Domains tab + operator console can manage it. Manual DNS mode is the
// right choice here: the wildcard A record is platform-managed.

import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { SourceType } from './new-deploy-utils';
import { linkSubdomainDomain } from './link-subdomain-domain';

export type CreateDeploymentInput = {
  sdk: FidscriptSDK;
  projectId: string;
  sourceType: SourceType;
  computedGitUrl: string;
  effectiveBranch: string;
  dockerfilePath: string;
  credentials: string;
  envVars: Record<string, string> | undefined;
  subdomain: string;
  assignedDomainId: string | null;
  uploadedArchive: { bucketId: string; objectKey: string } | null;
};

export type CreateDeploymentResult =
  | { ok: true; deploymentId: string }
  | { ok: false; error: string; domainLinkError?: string };

export async function createDeployment(input: CreateDeploymentInput): Promise<CreateDeploymentResult> {
  const {
    sdk, projectId, sourceType, computedGitUrl, effectiveBranch,
    dockerfilePath, credentials, envVars, subdomain, assignedDomainId, uploadedArchive,
  } = input;

  let deploymentId: string | undefined;
  try {
    if (sourceType === 'git') {
      const created = await sdk.deployments.create(projectId, {
        source: { type: 'git', git: { url: computedGitUrl, branch: effectiveBranch || 'main', ...(dockerfilePath.trim() && { dockerfilePath: dockerfilePath.trim() }), ...(credentials.trim() && { credentials: credentials.trim() }) } },
        branch: effectiveBranch || 'main',
        ...(envVars && { envVars }),
        ...(subdomain.trim() && { subdomain: subdomain.trim() }),
        ...(assignedDomainId && { domainId: assignedDomainId }),
      });
      deploymentId = (created as { id?: string }).id;
    } else if (uploadedArchive) {
      const created = await sdk.deployments.create(projectId, {
        source: { type: 'archive', archive: { bucketId: uploadedArchive.bucketId, objectKey: uploadedArchive.objectKey, ...(dockerfilePath.trim() && { dockerfilePath: dockerfilePath.trim() }) } },
        ...(envVars && { envVars }),
        ...(subdomain.trim() && { subdomain: subdomain.trim() }),
        ...(assignedDomainId && { domainId: assignedDomainId }),
      });
      deploymentId = (created as { id?: string }).id;
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Deployment failed' };
  }

  if (!deploymentId) {
    return { ok: false, error: 'No deployment id returned from server' };
  }

  let domainLinkError: string | undefined;
  if (subdomain.trim() && !assignedDomainId) {
    const link = await linkSubdomainDomain({
      sdk,
      projectId,
      subdomain: subdomain.trim(),
      deploymentId,
    });
    if (!link.ok) domainLinkError = link.error;
  }

  return { ok: true, deploymentId, ...(domainLinkError && { domainLinkError }) };
}