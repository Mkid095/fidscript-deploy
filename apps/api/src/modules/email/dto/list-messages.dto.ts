export class ListMessagesDto {
  mailboxId?: string;
  folder?: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam';
  unread?: boolean;
  limit?: number;
  offset?: number;
}
