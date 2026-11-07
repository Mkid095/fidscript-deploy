import { Module } from '@nestjs/common';
import { OverviewController } from './controllers/overview.controller';
import { OverviewService } from './services/overview.service';
import { ProjectsModule } from '@/modules/projects/projects.module';

/**
 * The platform overview — the signed-in landing page's data.
 */
@Module({
  imports: [ProjectsModule],
  controllers: [OverviewController],
  providers: [OverviewService],
  exports: [OverviewService],
})
export class OverviewModule {}
