import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Update build configuration.
 *
 * `buildTarget` (the monorepo app root) and `startupTimeoutSeconds` were the
 * only fields the runner consumed. The commands are now consumed too — but
 * they are **overrides**: when they are absent the buildpack re-derives
 * everything from the repository's own package.json, so a deployment still
 * works for any app without anybody typing a command.
 */
export class UpdateBuildConfigDto {
  @ApiPropertyOptional({ description: 'Monorepo app root for turbo/nx (e.g. "apps/web", "packages/frontend")' })
  @IsString()
  @IsOptional()
  buildTarget?: string;

  @ApiPropertyOptional({ description: 'Seconds to wait for the container to become healthy before marking FAILED' })
  @IsNumber()
  @IsOptional()
  startupTimeoutSeconds?: number;

  @ApiPropertyOptional({
    description:
      'The variables the build cannot run without. A deployment that is missing ' +
      'one of them fails before the build starts, naming the variable.',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredEnvVars?: string[];

  @ApiPropertyOptional({ description: 'Override: the dependency install command (e.g. "npm ci")' })
  @IsString()
  @IsOptional()
  installCommand?: string;

  @ApiPropertyOptional({ description: 'Override: the build command (e.g. "next build")' })
  @IsString()
  @IsOptional()
  buildCommand?: string;

  @ApiPropertyOptional({ description: 'Override: the start command (e.g. "npx next start")' })
  @IsString()
  @IsOptional()
  startCommand?: string;

  @ApiPropertyOptional({ description: 'Override: the port the application listens on (1024–65535)' })
  @IsNumber()
  @Min(1024)
  @Max(65535)
  @IsOptional()
  port?: number;

  /**
   * The container's ceilings. The host runs the platform and every project
   * on it, so a project's application gets a ceiling, not a promise: unset
   * means the platform default (512 MB / one core), and the bounds here are
   * the most a project may ever claim.
   */
  @ApiPropertyOptional({
    description: 'Container memory ceiling, in MB (128–8192). Unset: the platform default (512).',
  })
  @IsNumber()
  @Min(128)
  @Max(8192)
  @IsOptional()
  memoryLimitMb?: number;

  @ApiPropertyOptional({
    description: 'Container CPU ceiling, in millicpus (50–8000; 1000 = one core). Unset: the platform default (1000).',
  })
  @IsNumber()
  @Min(50)
  @Max(8000)
  @IsOptional()
  cpuLimitMillicpu?: number;
}
