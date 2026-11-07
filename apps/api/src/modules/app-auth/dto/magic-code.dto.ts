import { IsEmail, IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class MagicCodeDto {
  @IsEmail()
  email!: string;
}

export class VerifyMagicCodeDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  code!: string;
}
