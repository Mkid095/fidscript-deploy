import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongPassword } from '@/modules/auth/auth-password-policy';

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

/**
 * The body of `POST /auth/forgot-password`.
 *
 * Only the address. The kind of token is the route's business — asking for
 * it did not need the caller to name it, and the shared DTO required it, so
 * the natural body was refused with a 400.
 */
export class ForgotPasswordDto {
  @ApiProperty({ description: 'The address to send the reset link to', example: 'user@example.com' })
  @IsEmail()
  email!: string;
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

  @ApiProperty({ description: 'New password (≥12 chars, upper+lower+number).', minLength: 12 })
  @IsString()
  @IsStrongPassword()
  newPassword!: string;
}

export class ConfirmMagicLinkDto {
  @ApiProperty({ description: 'Token from the magic link email' })
  @IsString()
  token!: string;
}
