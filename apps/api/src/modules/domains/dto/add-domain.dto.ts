import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddDomainDto {
  @ApiProperty({ example: 'example.com', description: 'Full domain name to add' })
  @IsString()
  domain: string;

  @ApiPropertyOptional({ description: 'Which deployment this domain routes to (required)' })
  @IsUUID()
  deploymentId: string;

  @ApiPropertyOptional({ default: true, description: 'Enable automatic TLS via Let\'s Encrypt' })
  @IsBoolean()
  @IsOptional()
  sslEnabled?: boolean;
}
