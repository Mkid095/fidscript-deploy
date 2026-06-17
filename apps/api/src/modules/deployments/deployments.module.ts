import { Module } from '@nestjs/common';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import { BuildRunnerService } from './runner/build-runner.service';
import { DeploymentWorkerService } from './runner/deployment-worker.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [DeploymentsController],
  providers: [
    DeploymentsService,
    BuildRunnerService,
    DeploymentWorkerService,
  ],
  exports: [DeploymentsService],
})
export class DeploymentsModule {}