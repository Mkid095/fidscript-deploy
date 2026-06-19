import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from '@/modules/auth/controllers/auth.controller';
import { AuthService } from '@/modules/auth/services/auth.service';
import { AuthSessionService } from '@/modules/auth/services/auth-session.service';
import { AuthRegisterService } from '@/modules/auth/services/auth-register.service';
import { AuthLoginService } from '@/modules/auth/services/auth-login.service';
import { AuthTokenService } from '@/modules/auth/services/auth-token.service';
import { AuthProfileService } from '@/modules/auth/services/auth-profile.service';
import { AuthSessionMgmtService } from '@/modules/auth/services/auth-session-mgmt.service';
import { AuthApiKeyService } from '@/modules/auth/services/auth-api-key.service';
import { JwtStrategy } from '@/modules/auth/jwt.strategy';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { PlatformAdminGuard } from '@/modules/auth/guards/platform-admin.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret || secret === 'change-me') {
          return { secret: 'DEGRADED-MODE-DO-NOT-USE', signOptions: { expiresIn: '15m' } };
        }
        return { secret, signOptions: { expiresIn: '15m' } };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSessionService,
    AuthRegisterService,
    AuthLoginService,
    AuthTokenService,
    AuthProfileService,
    AuthSessionMgmtService,
    AuthApiKeyService,
    JwtStrategy,
    JwtAuthGuard,
    PlatformAdminGuard,
  ],
  exports: [AuthService, JwtAuthGuard, PlatformAdminGuard],
})
export class AuthModule {}
