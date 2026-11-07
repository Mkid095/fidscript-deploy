import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'acme-corp', description: 'URL-safe unique slug (lowercase, hyphens only)' })
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, { message: 'Slug must be lowercase, start/end with alphanumeric, hyphens in between' })
  slug!: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  logoUrl?: string;
}

export class CreateRoleDto {
  @ApiProperty({ example: 'DEVELOPER' })
  @IsString()
  name!: string;

  @ApiProperty({ example: ['domains.read', 'email.send', 'storage.read'] })
  @IsString({ each: true })
  permissions!: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}

export class InviteMemberDto {
  @ApiProperty({ example: 'developer@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: ['ADMIN', 'DEVELOPER', 'BILLING', 'VIEWER'] })
  @IsIn(['ADMIN', 'DEVELOPER', 'BILLING', 'VIEWER'])
  roleName!: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty()
  @IsString()
  roleId!: string;
}

export class CreateTeamDto {
  @ApiProperty({ example: 'Engineering' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateTeamDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class AddTeamMemberDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty({ enum: ['LEAD', 'MEMBER', 'VIEWER'], required: false })
  @IsOptional()
  @IsIn(['LEAD', 'MEMBER', 'VIEWER'])
  role?: 'LEAD' | 'MEMBER' | 'VIEWER';
}

export class UpdateTeamMemberRoleDto {
  @ApiProperty({ enum: ['LEAD', 'MEMBER', 'VIEWER'] })
  @IsIn(['LEAD', 'MEMBER', 'VIEWER'])
  role!: 'LEAD' | 'MEMBER' | 'VIEWER';
}

export class AcceptInvitationDto {
  @ApiProperty()
  @IsString()
  token!: string;
}
