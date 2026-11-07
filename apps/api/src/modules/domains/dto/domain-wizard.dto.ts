import { IsString, IsOptional, IsIn, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const DOMAIN_TYPES = ['DEPLOYMENT', 'EMAIL', 'INBOUND_EMAIL', 'TRACKING', 'API', 'REDIRECT', 'SANDBOX'] as const;
const DNS_PROVIDERS = ['cloudflare', 'route53', 'godaddy', 'namecheap', 'manual'] as const;

export class GetWizardRecordsDto {
  @ApiPropertyOptional({ description: 'Domain purpose(s)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsIn(DOMAIN_TYPES, { each: true })
  types?: string[];
}

export class StartWizardDto {
  @ApiPropertyOptional({ description: 'Domain purposes', type: [String] })
  @IsOptional()
  @IsArray()
  @IsIn(DOMAIN_TYPES, { each: true })
  types?: string[];

  @ApiPropertyOptional({ description: 'DNS provider', enum: DNS_PROVIDERS })
  @IsOptional()
  @IsIn(DNS_PROVIDERS)
  provider?: string;
}
