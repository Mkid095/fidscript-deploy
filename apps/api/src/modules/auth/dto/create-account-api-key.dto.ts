import { IsString, IsOptional, IsArray, IsDateString, MaxLength, IsIn } from 'class-validator';
import { SCOPE_ALLOWLIST } from '../constants/scope-allowlist';

export class CreateAccountApiKeyDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
