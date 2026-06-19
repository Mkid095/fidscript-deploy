import { IsArray, IsString } from 'class-validator';

export class DeleteMessagesDto {
  @IsArray()
  @IsString({ each: true })
  messageIds!: string[];
}
