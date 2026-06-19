import { IsArray, IsString, IsBoolean } from 'class-validator';

export class MarkMessagesReadDto {
  @IsArray()
  @IsString({ each: true })
  messageIds!: string[];

  @IsBoolean()
  isRead!: boolean;
}
