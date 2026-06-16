import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BuildStrategy } from './create-deployment.dto.js';

export class UpdateBuildConfigDto {
  @ApiPropertyOptional({ enum: BuildStrategy })
  @IsString()
  @IsOptional()
  strategy?: BuildStrategy;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  buildCommand?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  outputDirectory?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  healthCheckPath?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  healthCheckPort?: number;
}
