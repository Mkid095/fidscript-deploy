import { IsString, IsBoolean, IsOptional, IsUUID, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddDomainDto {
  @ApiProperty({ example: 'example.com', description: 'Full domain name to add' })
  @IsString()
  domain: string;

  @ApiProperty({ description: 'Which deployment this domain routes to' })
  @IsUUID()
  deploymentId: string;

  @ApiPropertyOptional({ description: "DNS configuration mode: 'manual' (default) or 'cloudflare_auto'", default: 'manual' })
  @IsIn(['manual', 'cloudflare_auto'])
  @IsOptional()
  dnsMode?: 'manual' | 'cloudflare_auto';

  @ApiPropertyOptional({ description: "Automatic WWW redirect: 'none' (default), 'www_to_root', or 'root_to_www'", default: 'none' })
  @IsIn(['none', 'www_to_root', 'root_to_www'])
  @IsOptional()
  redirectMode?: 'none' | 'www_to_root' | 'root_to_www';

  @ApiPropertyOptional({ description: 'Enable automatic TLS via Let\'s Encrypt', default: true })
  @IsBoolean()
  @IsOptional()
  sslEnabled?: boolean;
}
