import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '@/modules/auth/auth-password-policy';

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
  @IsStrongPassword()
  newPassword: string;
}
