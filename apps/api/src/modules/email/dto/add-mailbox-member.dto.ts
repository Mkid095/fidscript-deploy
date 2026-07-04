import { IsString, IsOptional, IsArray, IsEmail, IsUUID, IsIn } from 'class-validator';

export class AddMailboxMemberDto {
  /** User ID to add (mutually exclusive with apiKeyId) */
  @IsOptional()
  @IsUUID()
  userId?: string;

  /** Email API key ID to add (mutually exclusive with userId) */
  @IsOptional()
  @IsUUID()
  apiKeyId?: string;

  /** Role for this member */
  @IsOptional()
  @IsIn(['OWNER', 'MEMBER', 'ASSIGNEE'])
  role?: 'OWNER' | 'MEMBER' | 'ASSIGNEE' = 'MEMBER';

  /** Additional granular permissions (added to role defaults) */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class UpdateMailboxMemberDto {
  /** New role */
  @IsOptional()
  @IsIn(['OWNER', 'MEMBER', 'ASSIGNEE'])
  role?: 'OWNER' | 'MEMBER' | 'ASSIGNEE';

  /** Additional granular permissions (replaces existing) */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
