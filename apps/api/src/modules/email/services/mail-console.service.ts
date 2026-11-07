import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';

/**
 * How to reach the platform's mail server, and how to log into it.
 *
 * The operator installs the platform and is then told "the mail console is at
 * https://…/admin" — and nothing else: no username, no password, no host and
 * port for a mail client. So the credentials live in the installer's email
 * and nowhere else, and the first thing an operator has to do with the mail
 * application is to guess.
 *
 * This is where that is answered. The credential is the platform's own
 * admin token — the same one the platform submits system mail with — and it
 * is only ever served to a platform owner or admin.
 */
@Injectable()
export class MailConsoleService {
  constructor(private config: ConfigService) {}

  /** The console URL — the platform's own routing publishes it. */
  consoleUrl(): string {
    const domain = this.config.get<string>('PLATFORM_DOMAIN', 'localhost');
    return `https://stalwart-admin.${domain}/admin`;
  }

  /** The hostname a mail client connects to. */
  mailHost(): string {
    return this.config.get<string>('PLATFORM_MAIL_HOST', `mail.${this.config.get<string>('PLATFORM_DOMAIN', 'localhost')}`);
  }

  /** The admin credential: the user name and the token. */
  credential(): { username: string; password: string } {
    const tokenFile = this.config.get<string>(
      'STALWART_ADMIN_TOKEN_FILE',
      '/run/secrets/stalwart_admin_token',
    );
    let token = '';
    try {
      token = fs.readFileSync(tokenFile, 'utf8').trim();
    } catch {
      token = this.config.get<string>('STALWART_ADMIN_TOKEN', '');
    }
    return {
      username: this.config.get<string>('SMTP_SUBMISSION_USER', 'admin'),
      password: token,
    };
  }

  /** Everything a client needs to send and to read mail. */
  clientConfiguration() {
    const host = this.mailHost();
    const { username, password } = this.credential();
    return {
      consoleUrl: this.consoleUrl(),
      username,
      password,
      mailHost: host,
      smtp: { host, port: 465, secure: true, username, password },
      imap: { host, port: 993, secure: true },
      submission: { host, port: 587, secure: false, starttls: true, username, password },
    };
  }
}
