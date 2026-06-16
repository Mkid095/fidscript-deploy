import { Module } from '@nestjs/common';
import { AppAuthController } from './app-auth.controller.js';
import { AppAuthService } from './app-auth.service.js';

@Module({
  controllers: [AppAuthController],
  providers: [AppAuthService],
  exports: [AppAuthService],
})
export class AppAuthModule {}
