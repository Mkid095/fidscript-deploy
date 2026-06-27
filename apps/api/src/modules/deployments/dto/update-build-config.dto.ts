import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Update build configuration.
 *
 * Only buildTarget (monorepo app root) and startupTimeoutSeconds are consumed
 * by the deployment runner. All other fields (strategy, buildCommand,
 * outputDirectory, healthCheckPath, healthCheckPort) were dead code — the
 * build providers re-derive everything from package.json detection.
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
}
