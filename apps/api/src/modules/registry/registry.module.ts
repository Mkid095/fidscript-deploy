import { Module, Global } from '@nestjs/common';
import { RegistryService } from './registry.service';
import { RegistryController } from './registry.controller';

@Global()
@Module({
  controllers: [RegistryController],
  providers: [RegistryService],
  exports: [RegistryService],
})
export class RegistryModule {}