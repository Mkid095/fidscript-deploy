import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Body for `POST /auth/magic-code` (AUTH-19). */
export class MagicCodeDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

/** Body for `POST /auth/verify-magic-code` (AUTH-20). */
export class VerifyMagicCodeDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: 'The 6-digit code from the email.' })
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code: string;
}
