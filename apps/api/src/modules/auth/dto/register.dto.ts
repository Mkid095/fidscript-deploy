import { IsEmail, IsString, IsOptional, IsIn } from 'class-validator';
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

  @ApiPropertyOptional({ description: "The person's first name." })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: "The person's last name." })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description:
      'The company password — the shared secret the operator set during setup. ' +
      'Required when the platform has one.',
  })
  @IsString()
  @IsOptional()
  setupPassword?: string;

  @ApiPropertyOptional({ description: 'Preferred auth method: PASSWORD or MAGIC_CODE (defaults to PASSWORD)', enum: ['PASSWORD', 'MAGIC_CODE'] })
  @IsOptional()
  @IsIn(['PASSWORD', 'MAGIC_CODE'])
  authMethod?: 'PASSWORD' | 'MAGIC_CODE';

  @ApiPropertyOptional({ description: 'Signup access keyword — required for public registration.' })
  @IsString()
  @IsOptional()
  inviteKeyword?: string;
}
