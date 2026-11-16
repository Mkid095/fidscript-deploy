import { IsBoolean, IsString, Matches, MaxLength } from 'class-validator';

export class SetScopeAccessDto {
  /** The npm scope, e.g. `@soostori`. */
  @IsString()
  @MaxLength(128)
  @Matches(/^@[a-z0-9][a-z0-9._-]*$/, {
    message: 'scope must be an npm scope, e.g. @soostori',
  })
  scope: string;

  /** Whether the scope's packages are readable without a token. */
  @IsBoolean()
  anonymousRead: boolean;
}
