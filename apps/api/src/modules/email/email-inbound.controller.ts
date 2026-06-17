import {
  Controller, Post, Headers, Body, HttpCode, HttpStatus, UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { EmailInboundService } from './inbound.service';
import * as crypto from 'crypto';

@ApiTags('email-inbound')
@Controller('email/inbound')
export class EmailInboundController {
  constructor(
    private inboundService: EmailInboundService,
    private configService: ConfigService,
  ) {}

  private verifySignature(body: string, signature: string): boolean {
    const secret = this.configService.get('STALWART_WEBHOOK_SECRET', '');
    if (!secret) return true;
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stalwart inbound email webhook (Sieve notify)' })
  inboundWebhook(
    @Headers('x-stalwart-signature') signature: string,
    @Body() payload: { from: string; to: string; subject?: string; sizeBytes?: number; spamScore?: number },
  ) {
    const rawBody = JSON.stringify(payload);
    if (signature && !this.verifySignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    return this.inboundService.handleInboundEmail({
      from: payload.from,
      to: payload.to,
      subject: payload.subject ?? '',
      sizeBytes: payload.sizeBytes ?? 0,
      spamScore: payload.spamScore,
    });
  }
}
