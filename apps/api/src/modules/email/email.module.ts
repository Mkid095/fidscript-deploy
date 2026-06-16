import { Module } from '@nestjs/common';
import { EmailController } from './email.controller.js';
import { EmailService } from './email.service.js';
import { SmtpProvider } from './providers/smtp.provider.js';
import { ResendProvider } from './providers/resend.provider.js';
import { EMAIL_PROVIDER } from './providers/email-provider.interface.js';
import { ConfigService } from '@nestjs/config';

const EMAIL_PROVIDER_TOKEN = {
  provide: EMAIL_PROVIDER,
  useFactory: (configService: ConfigService) => {
    const provider = configService.get('EMAIL_PROVIDER', 'smtp');
    if (provider === 'resend') {
      return new ResendProvider(configService);
    }
    return new SmtpProvider(configService);
  },
  inject: [ConfigService],
};

@Module({
  controllers: [EmailController],
  providers: [EmailService, SmtpProvider, ResendProvider, EMAIL_PROVIDER_TOKEN],
  exports: [EmailService],
})
export class EmailModule {}