import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { resolveJwtSecret } from '@/common/secrets';
import { AuthController } from '@/modules/auth/controllers/auth.controller';
import { OrganizationController, InvitationAcceptController } from '@/modules/auth/controllers/organization.controller';
import { AuthService } from '@/modules/auth/services/auth.service';
import { AuthSessionService } from '@/modules/auth/services/auth-session.service';
import { AuthRegisterService } from '@/modules/auth/services/auth-register.service';
import { AuthOnboardingService } from '@/modules/auth/services/auth-onboarding.service';
import { AuthLoginService } from '@/modules/auth/services/auth-login.service';
import { AuthTokenService } from '@/modules/auth/services/auth-token.service';
import { AuthProfileService } from '@/modules/auth/services/auth-profile.service';
import { AuthSessionMgmtService } from '@/modules/auth/services/auth-session-mgmt.service';
import { AuthApiKeyService } from '@/modules/auth/services/auth-api-key.service';
import { AuthPasswordService } from '@/modules/auth/services/auth-password.service';
import { AuthMagicCodeService } from '@/modules/auth/services/auth-magic-code.service';
import { AuthVerificationService } from '@/modules/auth/services/auth-verification.service';
import { OrganizationService } from '@/modules/auth/services/organization.service';
import { TeamService } from '@/modules/auth/services/team.service';
import { EmailModule } from '@/modules/email/email.module';
import { JwtStrategy } from '@/modules/auth/jwt.strategy';
import { MfaService } from '@/modules/auth/mfa/mfa.service';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { PlatformAdminGuard } from '@/modules/auth/guards/platform-admin.guard';
import { InstallationGuard } from '@/modules/auth/guards/installation.guard';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { EmailVerifiedGuard } from '@/modules/auth/guards/email-verified.guard';
import { InstallationModule } from '@/modules/installation/installation.module';
import { ProjectsModule } from '@/modules/projects/projects.module';

@Module({
  imports: [
    InstallationModule,
    ProjectsModule,
    EmailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: resolveJwtSecret(configService),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, OrganizationController, InvitationAcceptController],
  providers: [
    AuthService,
    AuthSessionService,
    AuthRegisterService,
    AuthOnboardingService,
    AuthLoginService,
    AuthTokenService,
    AuthProfileService,
    AuthSessionMgmtService,
    AuthApiKeyService,
    AuthPasswordService,
    AuthMagicCodeService,
    AuthVerificationService,
    OrganizationService,
    TeamService,
    JwtStrategy,
    MfaService,
    JwtAuthGuard,
    ApiKeyOrJwtGuard,
    PlatformAdminGuard,
    InstallationGuard,
    ProjectMemberGuard,
    EmailVerifiedGuard,
  ],
  exports: [AuthService, OrganizationService, TeamService, JwtAuthGuard, ApiKeyOrJwtGuard, PlatformAdminGuard, InstallationGuard, ProjectMemberGuard, EmailVerifiedGuard, JwtModule],
})
export class AuthModule {}
