import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailModule } from '@/modules/email/email.module';
import { PassportModule } from '@nestjs/passport';
import { resolveJwtSecret } from '@/common/secrets';
import { AppAuthController } from '@/modules/app-auth/controllers/app-auth.controller';
import { AuthProvidersController } from '@/modules/app-auth/auth-providers/auth-providers.controller';
import { AppAuthUserService } from '@/modules/app-auth/services/app-auth-user.service';
import { AppAuthManagementService } from '@/modules/app-auth/services/app-auth-management.service';
import { AppAuthRegisterService } from '@/modules/app-auth/services/app-auth-register.service';
import { AppAuthLoginService } from '@/modules/app-auth/services/app-auth-login.service';
import { AppAuthTokenService } from '@/modules/app-auth/services/app-auth-token.service';
import { MagicCodeService } from '@/modules/app-auth/services/magic-code.service';
import { OAuthService } from '@/modules/app-auth/services/oauth.service';
import { AppAuthRoleService } from '@/modules/app-auth/services/app-auth-role.service';
import { AuthProvidersService } from '@/modules/app-auth/auth-providers/auth-providers.service';
import { AppJwtStrategy } from '@/modules/app-auth/jwt/app-jwt.strategy';
import { AppJwtGuard } from '@/modules/app-auth/jwt/app-jwt.guard';
import { ProjectsModule } from '@/modules/projects/projects.module';

@Module({
  imports: [
    EmailModule,
    ProjectsModule,
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
  controllers: [AppAuthController, AuthProvidersController],
  providers: [
    AppAuthUserService,
    AppAuthRegisterService,
    AppAuthLoginService,
    AppAuthTokenService,
    MagicCodeService,
    OAuthService,
    AppAuthRoleService,
    AppAuthManagementService,
    AuthProvidersService,
    AppJwtStrategy,
    AppJwtGuard,
  ],
  exports: [AppAuthUserService, AppAuthRoleService, AppJwtGuard, AppAuthTokenService, AppAuthManagementService],
})
export class AppAuthModule {}
