import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectFormatService {
  formatProject(project: any, extras: { role?: string } = {}) {
    const lastActivityAt = project.lastDeployAt ?? project.updatedAt;
    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      type: project.type?.toLowerCase(),
      shape: project.shape,
      deploymentOn: project.deploymentOn,
      status: project.status?.toLowerCase(),
      ownerId: project.ownerId,
      // Whether a push to the branch makes a new deployment. The console
      // shows this as a switch, so it has to be able to read it.
      autoDeploy: project.autoDeploy ?? true,
      owner: project.owner,
      region: project.region,
      subdomain: project.subdomain,
      // The workspace the project lives in: null is the owner's own.
      organizationId: project.organizationId ?? null,
      organization: project.organization ?? null,
      customDomains: project.customDomains || [],
      buildSettings: project.buildSettings || {},
      deploymentStrategy: project.deploymentStrategy,
      sourceProvider: project.sourceProvider,
      sourceRepo: project.sourceRepo,
      sourceBranch: project.sourceBranch,
      lastDeployAt: project.lastDeployAt,
      lastActivityAt,
      activeDeploymentId: project.settings?.activeDeploymentId ?? null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      deletedAt: project.deletedAt,
      ...(extras.role !== undefined && { role: extras.role }),
    };
  }
}
