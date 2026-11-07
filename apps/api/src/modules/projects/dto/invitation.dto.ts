import { IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty({ example: 'colleague@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'developer', description: 'Role: owner | admin | developer | viewer' })
  @IsString()
  role: string;
}

export class AcceptInvitationDto {
  @ApiProperty({ description: 'Accept invitation token' })
  @IsString()
  token: string;
}

export class ResendInvitationDto {
  @ApiProperty()
  @IsString()
  invitationId: string;
}