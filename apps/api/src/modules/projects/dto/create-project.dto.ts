import {
  IsString, IsEnum, IsOptional, IsBoolean, MinLength, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** What a project is for. The console derives the project's menu from it. */
export enum ProjectShape {
  BACKEND = 'BACKEND',
  DEPLOYMENT = 'DEPLOYMENT',
  BOTH = 'BOTH',
}

export enum ProjectType {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  WORKER = 'worker',
  CRON = 'cron',
  DOCKER = 'docker',
  STATIC = 'static',
}

export class CreateProjectDto {
  @ApiProperty({ minLength: 1, maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: ProjectType })
  @IsEnum(ProjectType)
  type: ProjectType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({
    enum: ProjectShape,
    description:
      'What the project is for. BACKEND — the application\'s data, users and ' +
      'files live in Instant. DEPLOYMENT — the platform builds and runs it. ' +
      'BOTH — each of them, kept apart. Defaults to DEPLOYMENT.',
  })
  @IsEnum(ProjectShape)
  @IsOptional()
  shape?: ProjectShape;

  @ApiPropertyOptional({
    description:
      'Whether the deployment service is on for this project. Defaults to the ' +
      'shape: on for DEPLOYMENT and BOTH, off for BACKEND.',
  })
  @IsBoolean()
  @IsOptional()
  deploymentOn?: boolean;

  @ApiPropertyOptional({
    description:
      'The workspace (organization / team) the project belongs to. Omit it and ' +
      'the project lives in the owner\'s own workspace.',
  })
  @IsString()
  @IsOptional()
  organizationId?: string;
}
