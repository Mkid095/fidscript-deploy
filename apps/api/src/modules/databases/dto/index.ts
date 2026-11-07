import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDatabaseDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ enum: ['production', 'staging', 'preview', 'development'] })
  @IsOptional()
  @IsEnum(['production', 'staging', 'preview', 'development'])
  environment?: 'production' | 'staging' | 'preview' | 'development';

  @ApiPropertyOptional({ enum: ['postgresql', 'mysql', 'redis'] })
  @IsOptional()
  @IsEnum(['postgresql', 'mysql', 'redis'])
  type?: 'postgresql' | 'mysql' | 'redis';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxConnections?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;
}

export class UpdateDatabaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  settings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  backupRetentionDays?: number;
}

export class CreateBackupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class RestoreBackupDto {
  @ApiProperty()
  @IsString()
  backupId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetDatabaseId?: string;
}

export class RotateCredentialsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}

export class GetConnectionInfoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  poolOnly?: boolean;
}

/** Strip connectionInfo from list/get responses — never leak credentials */
export class DatabaseResponseDto {
  id!: string;
  projectId!: string;
  name!: string;
  type!: string;
  version!: string;
  size!: string;
  status!: string;
  host!: string | null;
  port!: number | null;
  username!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
