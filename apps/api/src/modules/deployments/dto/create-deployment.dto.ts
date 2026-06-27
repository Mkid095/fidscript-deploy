import { IsString, IsOptional, IsEnum, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SourceType {
  GIT = 'git',
  ARCHIVE = 'archive',
}

export class GitSourceDto {
  @ApiPropertyOptional({ description: 'Git repo URL' })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ description: 'Deploy key or token (optional for public repos)' })
  @IsString()
  @IsOptional()
  credentials?: string;

  @ApiPropertyOptional({ default: 'main' })
  @IsString()
  @IsOptional()
  branch?: string;

  @ApiPropertyOptional({ description: 'Path to Dockerfile (relative to repo root). Overrides auto-detection.' })
  @IsString()
  @IsOptional()
  dockerfilePath?: string;
}

export class ArchiveSourceDto {
  @ApiPropertyOptional({ description: 'Bucket ID in storage' })
  @IsString()
  @IsOptional()
  bucketId?: string;

  @ApiPropertyOptional({ description: 'Object key in the bucket' })
  @IsString()
  @IsOptional()
  objectKey?: string;

  @ApiPropertyOptional({ description: 'Path to Dockerfile in archive (relative to archive root). Overrides auto-detection.' })
  @IsString()
  @IsOptional()
  dockerfilePath?: string;
}

export class DeploymentSourceDto {
  @ApiProperty({ enum: SourceType })
  @IsEnum(SourceType)
  type!: SourceType;

  @ApiPropertyOptional({ type: GitSourceDto })
  @ValidateNested()
  @Type(() => GitSourceDto)
  @IsOptional()
  git?: GitSourceDto;

  @ApiPropertyOptional({ type: ArchiveSourceDto })
  @ValidateNested()
  @Type(() => ArchiveSourceDto)
  @IsOptional()
  archive?: ArchiveSourceDto;
}

export class CreateDeploymentDto {
  @ApiPropertyOptional({ description: 'Source to deploy (git repo or archive from storage)' })
  @ValidateNested()
  @Type(() => DeploymentSourceDto)
  @IsOptional()
  source?: DeploymentSourceDto;

  @ApiPropertyOptional({ default: 'main' })
  @IsString()
  @IsOptional()
  branch?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  commitSha?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  commitMessage?: string;

  @ApiPropertyOptional({ description: 'Environment variables to inject at build and runtime. Overrides project-level env vars.' })
  @IsObject()
  @IsOptional()
  envVars?: Record<string, string>;
}
