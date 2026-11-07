import {
  IsString, IsOptional, IsObject, IsEnum, IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectShape } from './create-project.dto';

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  envVars?: Record<string, string>;

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  buildSettings?: Record<string, any>;

  @ApiPropertyOptional({
    enum: ProjectShape,
    description:
      'What the project is for. Changing it changes the project\'s menu; ' +
      'nothing is deleted.',
  })
  @IsEnum(ProjectShape)
  @IsOptional()
  shape?: ProjectShape;

  @ApiPropertyOptional({
    description: 'Whether the deployment service is on for this project.',
  })
  @IsBoolean()
  @IsOptional()
  deploymentOn?: boolean;
}
