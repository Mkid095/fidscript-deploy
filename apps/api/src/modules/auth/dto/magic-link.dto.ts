import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MagicLinkDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class VerifyMagicLinkDto {
  @ApiProperty()
  @IsString()
  token: string;
}
