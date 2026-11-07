import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CloneProjectDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;
}
