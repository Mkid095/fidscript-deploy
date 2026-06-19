import { Module } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { StorageModule } from '@/modules/storage/storage.module';
import { DeploymentsModule } from '@/modules/deployments/deployments.module';
import { ProjectsModule } from '@/modules/projects/projects.module';

@Module({
  imports: [StorageModule, DeploymentsModule, ProjectsModule],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}