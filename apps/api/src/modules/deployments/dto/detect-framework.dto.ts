import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Request body for POST /deployments/detect.
 * The platform clones the repo shallowly, runs framework detection,
 * and returns a BuildPlan — without deploying.
 */
export class DetectFrameworkDto {
  @ApiPropertyOptional({ description: 'Git repository URL to scan' })
  @IsString()
  gitUrl!: string;

  @ApiPropertyOptional({ default: 'main' })
  @IsString()
  @IsOptional()
  branch?: string;

  @ApiPropertyOptional({ description: 'Deploy key or token (for private repos)' })
  @IsString()
  @IsOptional()
  credentials?: string;
}
