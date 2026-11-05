import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailModule } from '@/modules/email/email.module';
import { PassportModule } from '@nestjs/passport';
import { resolveJwtSecret } from '@/common/secrets';
import { UserGithubController } from '@/modules/app-auth/controllers/user-github.controller';
import { AppAuthTokenService } from '@/modules/app-auth/services/app-auth-token.service';
import { MagicCodeService } from '@/modules/app-auth/services/magic-code.service';
import { UserGithubService } from '@/modules/app-auth/services/user-github.service';
import { AppJwtStrategy } from '@/modules/app-auth/jwt/app-jwt.strategy';
import { AppJwtGuard } from '@/modules/app-auth/jwt/app-jwt.guard';
import { ProjectsModule } from '@/modules/projects/projects.module';

/**
 * App-scoped users — but NOT the app developer's auth.
 *
 * An application's own users and permissions are Instant's job: its CEL
 * rules are evaluated per entity per action against live data, which the
 * platform's per-project role blobs never were. The app-facing auth surface
 * that used to live here — `POST /projects/:id/auth`, the OAuth provider
 * configuration, the role management — is gone. See
 * `docs/CAPABILITY_OVERLAP.md`.
 *
 * What is left is what two other products depend on:
 *
 * - the **magic-code login** the WhatsApp console signs in with, and
 * - the **GitHub credentials** the deployment pipeline injects when it
 *   clones a private repository.
 *
 * Both are platform products, not app-developer surfaces. The GitHub
 * controller in particular is the operator's own account connection, and the
 * OAuth callback URL the service builds points at it — removing it would
 * break the connect flow.
 */
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
  controllers: [UserGithubController],
  providers: [
    AppAuthTokenService,
    MagicCodeService,
    UserGithubService,
    AppJwtStrategy,
    AppJwtGuard,
  ],
  exports: [AppJwtGuard, AppAuthTokenService, UserGithubService, MagicCodeService],
})
export class AppAuthModule {}
