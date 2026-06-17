import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import { PrismaService } from '@/prisma/prisma.service';

export interface TokenPayload {
  userId: string;
  projectId: string;
}

@Injectable()
export class TokenService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async validateJwt(token: string): Promise<TokenPayload | null> {
    try {
      const jwt = await import('jsonwebtoken');

      let secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        const secretFile = this.configService.get<string>('JWT_SECRET_FILE');
        if (secretFile) {
          secret = fs.readFileSync(secretFile, 'utf8').trim();
        }
      }
      if (!secret) return null;

      const decoded = jwt.default.verify(token, secret) as { userId: string; projectId?: string };

      return {
        userId: decoded.userId,
        projectId: decoded.projectId || '',
      };
    } catch {
      return null;
    }
  }

  async validateChannelToken(channelId: string, userId: string, token: string): Promise<boolean> {
    if (!token) return false;

    const channel = await this.prisma.realtimeChannel.findUnique({
      where: { id: channelId },
      select: { accessToken: true, projectId: true },
    });
    if (!channel || !channel.accessToken) return false;

    try {
      return await bcrypt.compare(token, channel.accessToken);
    } catch {
      return false;
    }
  }
}
