import { Module } from '@nestjs/common';
import { EmailModule } from '@/modules/email/email.module';
import { AppAuthController } from '@/modules/app-auth/controllers/app-auth.controller';
import { AppAuthUserService } from '@/modules/app-auth/services/app-auth-user.service';
import { AppAuthRegisterService } from '@/modules/app-auth/services/app-auth-register.service';
import { AppAuthLoginService } from '@/modules/app-auth/services/app-auth-login.service';
import { MagicCodeService } from '@/modules/app-auth/services/magic-code.service';
import { AppAuthRoleService } from '@/modules/app-auth/services/app-auth-role.service';

@Module({
  imports: [EmailModule],
  controllers: [AppAuthController],
  providers: [AppAuthUserService, AppAuthRegisterService, AppAuthLoginService, MagicCodeService, AppAuthRoleService],
  exports: [AppAuthUserService, AppAuthRoleService],
})
export class AppAuthModule {}
