import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from "class-validator";

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
