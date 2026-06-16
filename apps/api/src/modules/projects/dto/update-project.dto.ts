import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
}
