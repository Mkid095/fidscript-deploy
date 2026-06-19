import { Allow } from 'class-validator';

// Platform generates the new password — never accepts user-supplied passwords.
// `@Allow()` keeps the empty body valid through the ValidationPipe whitelist.
export class ResetMailboxPasswordDto {
  @Allow()
  _?: never;
}
