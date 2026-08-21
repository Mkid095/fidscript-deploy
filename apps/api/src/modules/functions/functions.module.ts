import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { resolveJwtSecret } from '@/common/secrets';
import { FunctionsController } from './functions.controller';
import { FunctionsService } from './functions.service';
import { FunctionsCrudService } from './services/functions-crud.service';
import { FunctionsRuntimeService } from './services/functions-runtime.service';
import { SandboxedRunnerService } from './services/sandboxed-runner.service';
import { NodeJsRuntime } from './runtimes/nodejs.runtime';
import { PythonRuntime } from './runtimes/python.runtime';
import { AuthModule } from '@/modules/auth/auth.module';
import { ProjectsModule } from '@/modules/projects/projects.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: resolveJwtSecret(config),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => AuthModule),
    forwardRef(() => ProjectsModule),
  ],
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