import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider, SendEmailOptions } from './email-provider.interface';

interface ResendConfig {
  apiKey: string;
  fromEmail: string;
}

@Injectable()
export class ResendProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get('RESEND_API_KEY', '');
    this.fromEmail = this.configService.get('RESEND_FROM_EMAIL', 'noreply@resend.dev');
  }

  async send(options: SendEmailOptions): Promise<{ messageId: string; accepted: string[]; rejected: string[] }> {
    if (!this.apiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from || this.fromEmail,
        to: options.to,
        reply_to: options.replyTo,
        subject: options.subject,
        text: options.text,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await response.json() as { id: string };

    return {
      messageId: data.id,
      accepted: [options.to],
      rejected: [],
    };
  }

  async sendBulk(options: SendEmailOptions[]): Promise<{ messageId: string; accepted: string[]; rejected: string[] }[]> {
    return Promise.all(options.map(opt => this.send(opt)));
  }
}