import { Module } from '@nestjs/common';

import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { DeploymentsModule } from '@/modules/deployments/deployments.module';

@Module({
  imports: [PrismaModule, DeploymentsModule],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
