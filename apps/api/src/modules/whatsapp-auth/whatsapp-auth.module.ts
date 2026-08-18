import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { resolveJwtSecret } from '@/common/secrets';
import { EmailModule } from '@/modules/email/email.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { AppAuthModule } from '@/modules/app-auth/app-auth.module';
import { WhatsappAuthController } from './whatsapp-auth.controller';

@Module({
  imports: [
    EmailModule,
    ProjectsModule,
    AppAuthModule,
    PassportModule.register({ defaultStrategy: 'app-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: resolveJwtSecret(configService),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [WhatsappAuthController],
})
export class WhatsappAuthModule {}
