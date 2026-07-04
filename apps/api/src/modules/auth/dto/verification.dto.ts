import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendVerificationDto {
  @ApiProperty({ description: 'Email address to send verification to', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Type of verification token to send',
    enum: ['EMAIL_VERIFY', 'PASSWORD_RESET', 'MAGIC_LINK'],
    example: 'EMAIL_VERIFY',
  })
  @IsIn(['EMAIL_VERIFY', 'PASSWORD_RESET', 'MAGIC_LINK'])
  type!: 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'MAGIC_LINK';
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Token from the verification email link', example: 'a1b2c3...' })
  @IsString()
  token!: string;
}

export class ConfirmPasswordResetDto {
  @ApiProperty({ description: 'Token from the password reset email link' })
  @IsString()
  token!: string;

  @ApiProperty({ description: 'New password (min 8 characters)', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class ConfirmMagicLinkDto {
  @ApiProperty({ description: 'Token from the magic link email' })
  @IsString()
  token!: string;
}
