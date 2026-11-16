import { IsString, IsBoolean, IsOptional, IsUUID, IsIn, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const DOMAIN_TYPES = ['DEPLOYMENT', 'EMAIL', 'INBOUND_EMAIL', 'TRACKING', 'API', 'REDIRECT', 'SANDBOX'] as const;

export class AddDomainDto {
  @ApiProperty({ example: 'example.com', description: 'Full domain name to add' })
  @IsString()
  domain: string;

  @ApiPropertyOptional({ description: 'Which deployment this domain routes to (optional — can be set later)' })
  @IsOptional()
  @IsUUID()
  deploymentId?: string;

  @ApiPropertyOptional({
    description: `Domain purposes: ${DOMAIN_TYPES.join(' | ')}`,
    default: ['DEPLOYMENT'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsIn(DOMAIN_TYPES, { each: true })
  type?: string[];

  @ApiPropertyOptional({ description: "DNS configuration mode: 'manual' (default) or 'cloudflare_auto'", default: 'manual' })
  @IsIn(['manual', 'cloudflare_auto'])
  @IsOptional()
  dnsMode?: 'manual' | 'cloudflare_auto';

  @ApiPropertyOptional({ description: "Automatic WWW redirect: 'none' (default), 'www_to_root', or 'root_to_www'", default: 'none' })
  @IsIn(['none', 'www_to_root', 'root_to_www'])
  @IsOptional()
  redirectMode?: 'none' | 'www_to_root' | 'root_to_www';

  @ApiPropertyOptional({ description: "Enable automatic TLS via Let's Encrypt", default: true })
  @IsBoolean()
  @IsOptional()
  sslEnabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Take the name over from the other project that has it. Only meaningful ' +
      'when the name is already registered by another project; the platform ' +
      'moves it here and releases it there. Off by default — the answer is a ' +
      'conflict, not a silent takeover.',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  takeOver?: boolean;
}
