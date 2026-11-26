import { Module } from '@nestjs/common';

import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { DockerSpaceService } from './docker-space.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { DeploymentsModule } from '@/modules/deployments/deployments.module';

@Module({
  imports: [PrismaModule, DeploymentsModule],
  controllers: [SystemController],
  providers: [SystemService, DockerSpaceService],
  exports: [SystemService, DockerSpaceService],
})
export class SystemModule {}
