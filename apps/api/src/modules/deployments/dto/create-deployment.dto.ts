import { IsString, IsOptional, IsEnum, ValidateNested, IsIn, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BuildStrategy {
  BUILDPACK = 'buildpack',
  DOCKERFILE = 'dockerfile',
  ARCHIVE = 'archive',
}

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

  @ApiPropertyOptional({ description: 'Path to Dockerfile (relative to repo root)' })
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

  @ApiPropertyOptional({ description: 'Path to Dockerfile in archive (relative to archive root)' })
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

  @ApiPropertyOptional({ enum: BuildStrategy })
  @IsEnum(BuildStrategy)
  @IsOptional()
  strategy?: BuildStrategy;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  commitMessage?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  envVars?: Record<string, string>;
}