import { Injectable } from '@nestjs/common';
import { DeploymentStateService } from './deployment-state.service';
import { DeploymentLifecycleService } from './deployment-lifecycle.service';
import { DeploymentRollbackService } from './deployment-rollback.service';

// Re-exports for backwards-compatibility
export { DeploymentStateService } from './deployment-state.service';

@Injectable()
export class DeploymentWorkerService {
  constructor(
    private state: DeploymentStateService,
    private lifecycle: DeploymentLifecycleService,
    private rollback: DeploymentRollbackService,
  ) {}

  async stopDeployment(deploymentId: string, userId: string) {
    return this.lifecycle.stopDeployment(deploymentId, userId);
  }

  async restartDeployment(deploymentId: string, userId: string) {
    return this.lifecycle.restartDeployment(deploymentId, userId);
  }

  async destroyDeployment(deploymentId: string, userId: string) {
    return this.lifecycle.destroyDeployment(deploymentId, userId);
  }

  async rollbackToPreviousImage(targetDeploymentId: string, userId: string) {
    return this.rollback.rollbackToPreviousImage(targetDeploymentId, userId);
  }
}
