import { Module } from '@nestjs/common';
import { FunctionsController } from './functions.controller';
import { FunctionsService } from './functions.service';
import { FunctionsCrudService } from './services/functions-crud.service';
import { FunctionsRuntimeService } from './services/functions-runtime.service';
import { SandboxedRunnerService } from './services/sandboxed-runner.service';
import { NodeJsRuntime } from './runtimes/nodejs.runtime';
import { PythonRuntime } from './runtimes/python.runtime';

@Module({
  controllers: [FunctionsController],
  providers: [
    FunctionsService,
    FunctionsCrudService,
    FunctionsRuntimeService,
    SandboxedRunnerService,
    NodeJsRuntime,
    PythonRuntime,
  ],
  exports: [FunctionsService],
})
export class FunctionsModule {}