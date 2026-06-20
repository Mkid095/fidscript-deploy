import { IsArray, IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpsertAuthProviderDto {
  @IsString()
  clientId!: string;

  @IsString()
  clientSecret!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  scopes?: string[];

  @IsOptional()
  @IsString()
  redirectUri?: string;
}