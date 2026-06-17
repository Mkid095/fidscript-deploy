import { Injectable } from '@nestjs/common';
import { DeploymentCrudService } from '@/modules/deployments/services/deployment-crud.service';

export { DeploymentCrudService } from '@/modules/deployments/services/deployment-crud.service';

@Injectable()
export class DeploymentsService {
  constructor(private crud: DeploymentCrudService) {}

  create(userId: string, projectId: string, dto: any) { return this.crud.create(userId, projectId, dto); }
  list(userId: string, projectId: string, page?: number, limit?: number) { return this.crud.list(userId, projectId, page, limit); }
  get(userId: string, projectId: string, deploymentId: string) { return this.crud.get(userId, projectId, deploymentId); }
  getLogs(userId: string, projectId: string, deploymentId: string) { return this.crud.getLogs(userId, projectId, deploymentId); }
  stop(userId: string, projectId: string, deploymentId: string) { return this.crud.stop(userId, projectId, deploymentId); }
  restart(userId: string, projectId: string, deploymentId: string) { return this.crud.restart(userId, projectId, deploymentId); }
  destroy(userId: string, projectId: string, deploymentId: string) { return this.crud.destroy(userId, projectId, deploymentId); }
  rollback(userId: string, projectId: string, deploymentId: string) { return this.crud.rollback(userId, projectId, deploymentId); }
  getBuildConfig(userId: string, projectId: string) { return this.crud.getBuildConfig(userId, projectId); }
  updateBuildConfig(userId: string, projectId: string, dto: any) { return this.crud.updateBuildConfig(userId, projectId, dto); }
}
