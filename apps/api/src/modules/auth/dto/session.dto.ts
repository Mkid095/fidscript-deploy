import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiPropertyOptional()
  ipAddress?: string;

  @ApiPropertyOptional()
  userAgent?: string;

  @ApiProperty()
  createdAt: Date;
}

export class RevokeSessionDto {
  @ApiProperty()
  @IsString()
  sessionId: string;
}
