import { Module } from '@nestjs/common';
import { AppAuthController } from '@/modules/app-auth/controllers/app-auth.controller';
import { AppAuthUserService } from '@/modules/app-auth/services/app-auth-user.service';
import { AppAuthRegisterService } from '@/modules/app-auth/services/app-auth-register.service';
import { AppAuthLoginService } from '@/modules/app-auth/services/app-auth-login.service';
import { AppAuthRoleService } from '@/modules/app-auth/services/app-auth-role.service';

@Module({
  controllers: [AppAuthController],
  providers: [
    AppAuthUserService,
    AppAuthRegisterService,
    AppAuthLoginService,
    AppAuthRoleService,
  ],
  exports: [AppAuthUserService, AppAuthRoleService],
})
export class AppAuthModule {}
