import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Body for `POST /auth/change-password` (PREREQ-AUTH-2).
 *
 * Strength rules mirror the dashboard `PasswordStrength` component: ≥12 chars
 * with upper + lower + number (special char recommended, not required). The new
 * password must differ from the current one — enforced in the service.
 */
export class ChangePasswordDto {
  @ApiProperty({ description: "The user’s current password. Empty string for magic-code users creating their first password." })
  @IsString()
  currentPassword: string;

  @ApiProperty({ minLength: 12, description: 'The new password (≥12 chars, upper+lower+number).' })
  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'Password must contain upper + lower + a number',
  })
  newPassword: string;
}
