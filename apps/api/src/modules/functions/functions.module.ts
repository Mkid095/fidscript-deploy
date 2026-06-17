import { Module } from '@nestjs/common';
import { FunctionsController } from './functions.controller';
import { FunctionsService } from './functions.service';
import { NodeJsRuntime } from './runtimes/nodejs.runtime';
import { PythonRuntime } from './runtimes/python.runtime';
import { RUNTIME } from './runtimes/runtime.interface';
import { ConfigService } from '@nestjs/config';

const RUNTIME_TOKEN = {
  provide: RUNTIME,
  useFactory: (configService: ConfigService) => {
    const runtimeType = configService.get('DEFAULT_RUNTIME', 'nodejs');
    if (runtimeType === 'python') {
      return new PythonRuntime();
    }
    return new NodeJsRuntime();
  },
  inject: [ConfigService],
};

@Module({
  controllers: [FunctionsController],
  providers: [FunctionsService, NodeJsRuntime, PythonRuntime, RUNTIME_TOKEN],
  exports: [FunctionsService],
})
export class FunctionsModule {}