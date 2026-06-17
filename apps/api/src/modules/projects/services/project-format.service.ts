import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectFormatService {
  formatProject(project: any) {
    return {
      id: project.id, name: project.name, slug: project.slug,
      description: project.description, type: project.type?.toLowerCase(),
      status: project.status?.toLowerCase(), ownerId: project.ownerId,
      owner: project.owner, region: project.region, subdomain: project.subdomain,
      customDomains: project.customDomains || [], buildSettings: project.buildSettings || {},
      deploymentStrategy: project.deploymentStrategy, sourceProvider: project.sourceProvider,
      sourceRepo: project.sourceRepo, sourceBranch: project.sourceBranch,
      lastDeployAt: project.lastDeployAt, createdAt: project.createdAt, updatedAt: project.updatedAt,
    };
  }
}
