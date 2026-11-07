import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetupPasswordDto {
  @ApiProperty({
    description:
      'The company password — the shared secret a new account has to present. ' +
      'Stored as a bcrypt hash; it is never shown again.',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  setupPassword: string;
}
