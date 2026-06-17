import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BuildStrategy {
  BUILDPACK = 'buildpack',
  DOCKERFILE = 'dockerfile',
}

export class CreateDeploymentDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  branch?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  commitSha?: string;

  @ApiPropertyOptional({ enum: BuildStrategy })
  @IsEnum(BuildStrategy)
  @IsOptional()
  strategy?: BuildStrategy;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  commitMessage?: string;
}
