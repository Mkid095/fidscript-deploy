import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { SmtpProvider } from './providers/smtp.provider';
import { ResendProvider } from './providers/resend.provider';
import { EMAIL_PROVIDER } from './providers/email-provider.interface';
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