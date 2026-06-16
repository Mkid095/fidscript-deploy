import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddDomainDto {
  @ApiProperty({ example: 'example.com' })
  @IsString()
  domain: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  sslEnabled?: boolean;
}
