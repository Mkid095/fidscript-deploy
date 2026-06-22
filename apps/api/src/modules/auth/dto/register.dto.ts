import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Password-based account. Omit if using magic code.' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Preferred auth method: PASSWORD or MAGIC_CODE (defaults to PASSWORD)', enum: ['PASSWORD', 'MAGIC_CODE'] })
  @IsOptional()
  @IsIn(['PASSWORD', 'MAGIC_CODE'])
  authMethod?: 'PASSWORD' | 'MAGIC_CODE';
}
