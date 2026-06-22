import { IsEmail, IsIP, IsString, IsOptional, MinLength, IsIn } from 'class-validator';

export class ConfigureInstallationDto {
  @IsString()
  @MinLength(1)
  platformName!: string;

  @IsString()
  @MinLength(1)
  platformDomain!: string;

  @IsString()
  @IsIP('4')
  serverIp!: string;

  @IsEmail()
  adminEmail!: string;

  /** 'PASSWORD' or 'MAGIC_CODE' */
  @IsString()
  @IsIn(['PASSWORD', 'MAGIC_CODE'])
  authMethod!: 'PASSWORD' | 'MAGIC_CODE';

  /** Admin password — required when authMethod is PASSWORD, ignored for MAGIC_CODE */
  @IsString()
  @IsOptional()
  adminPassword?: string;

  /** Cloudflare API token for auto-DNS. If omitted, manual DNS required. */
  @IsString()
  @IsOptional()
  cloudflareApiToken?: string;

  @IsString()
  @IsOptional()
  dnsMode?: string;
}

export class ValidateInstallationDto {
  @IsString()
  @IsOptional()
  platformDomain?: string;
}

export interface StepValidationIssue {
  step: string;
  valid: boolean;
  issues: string[];
}

export interface StepResult {
  step: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface DiscoveryResult {
  serverIp: string;
  adminEmail: string | null;
  lifecycle: string;
  existingInstallation: {
    version: string | null;
    projectCount: number;
    userCount: number;
  } | null;
  dockerAvailable: boolean;
  traefikConfigured: boolean;
  cloudflareTokenFound: boolean;
  existingCertificateFound: boolean;
}
