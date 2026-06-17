import { Module } from '@nestjs/common';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import { BuildRunnerService } from './runner/build-runner.service';
import { DockerRunService } from './runner/docker-run.service';
import { DeploymentWorkerService } from './runner/deployment-worker.service';
import { DeploymentStateService } from './runner/deployment-state.service';
import { DeploymentLifecycleService } from './runner/deployment-lifecycle.service';
import { DeploymentRollbackService } from './runner/deployment-rollback.service';
import { DockerfileBuildProvider } from './providers/dockerfile-build.provider';
import { StorageModule } from '@/modules/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [DeploymentsController],
  providers: [
    DeploymentsService,
    BuildRunnerService,
    DockerRunService,
    DeploymentWorkerService,
    DeploymentStateService,
    DeploymentLifecycleService,
    DeploymentRollbackService,
    DockerfileBuildProvider,
    { provide: 'BUILD_PROVIDER', useExisting: DockerfileBuildProvider },
  ],
  exports: [DeploymentsService, DeploymentWorkerService],
})
export class DeploymentsModule {}
