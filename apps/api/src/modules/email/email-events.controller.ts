import {
  Controller, Post, Headers, Body, HttpCode, HttpStatus, UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { EmailInboundService } from './inbound.service';
import * as crypto from 'crypto';

@ApiTags('email-events')
@Controller('email/events')
export class EmailEventsController {
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

  @Post('bounce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stalwart bounce webhook — updates message status' })
  handleBounce(
    @Headers('x-stalwart-signature') signature: string,
    @Body() payload: { messageId: string; to: string; error: string; code?: string },
  ) {
    const rawBody = JSON.stringify(payload);
    if (signature && !this.verifySignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    return this.inboundService.handleBounce(payload);
  }

  @Post('complaint')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stalwart complaint (FBL) webhook — adds recipient to suppression list' })
  handleComplaint(
    @Headers('x-stalwart-signature') signature: string,
    @Body() payload: { email: string; userAgent?: string },
  ) {
    const rawBody = JSON.stringify(payload);
    if (signature && !this.verifySignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    return this.inboundService.handleComplaint(payload);
  }
}
