import { AuthGuard } from '@nestjs/passport';

export class AppJwtGuard extends AuthGuard('app-jwt') {}