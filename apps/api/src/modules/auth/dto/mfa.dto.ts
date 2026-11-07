import { IsString, IsNotEmpty, IsOptional, MinLength, MaxLength } from 'class-validator';

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

  /** A 6-digit TOTP code, or a recovery code (`abcd1234-efgh56`). */
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(32)
  code!: string;
}

/** Setting MFA up again while it is already on needs the current factor. */
export class MfaSetupDto {
  @IsString()
  @IsOptional()
  code?: string;
}

/** Turning MFA off needs a reauthentication: the password, or a code. */
export class MfaDisableDto {
  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  code?: string;
}
