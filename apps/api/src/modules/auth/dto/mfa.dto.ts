import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

/** A 6-digit TOTP code from an authenticator app. */
export class MfaCodeDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(8)
  code!: string;
}

/** The challenge token (issued after correct password) + a TOTP code. */
export class MfaChallengeDto {
  @IsString()
  @IsNotEmpty()
  mfaToken!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(8)
  code!: string;
}
