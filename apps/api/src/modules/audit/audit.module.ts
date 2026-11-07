import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './controllers/audit.controller';
import { AuthModule } from '@/modules/auth/auth.module';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
