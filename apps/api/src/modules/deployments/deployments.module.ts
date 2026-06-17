import { Module } from '@nestjs/common';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import { DeploymentCrudService } from './services/deployment-crud.service';
import { BuildRunnerService } from './runner/build-runner.service';
import { DockerRunService } from './runner/docker-run.service';
import { DeploymentWorkerService } from './runner/deployment-worker.service';
import { DeploymentStateService } from './runner/deployment-state.service';
import { DeploymentLifecycleService } from './runner/deployment-lifecycle.service';
import { DeploymentRollbackService } from './runner/deployment-rollback.service';
import { DockerLifecycleService } from './runner/docker-lifecycle.service';
import { DockerBuildArgsService } from './runner/docker-build-args.service';
import { DockerfileBuildProvider } from './providers/dockerfile-build.provider';
import { DockerBuildWorkspaceService } from './providers/docker-build-workspace.service';
import { StorageModule } from '@/modules/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [DeploymentsController],
  providers: [
    DeploymentsService,
    DeploymentCrudService,
    BuildRunnerService,
    DockerRunService,
    DeploymentWorkerService,
    DeploymentStateService,
    DeploymentLifecycleService,
    DeploymentRollbackService,
    DockerLifecycleService,
    DockerBuildArgsService,
    DockerBuildWorkspaceService,
    DockerfileBuildProvider,
    { provide: 'BUILD_PROVIDER', useExisting: DockerfileBuildProvider },
  ],
  exports: [DeploymentsService, DeploymentWorkerService],
})
export class DeploymentsModule {}
