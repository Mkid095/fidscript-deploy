import {
  Controller, Post, Headers, Body, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { EmailInboundService } from '@/modules/email/services/inbound.service';
import { WebhookSignatureService } from '@/modules/email/services/webhook-signature.service';
import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('email-inbound')
@Controller('email/inbound')
export class EmailInboundController {
  constructor(
    private inboundService: EmailInboundService,
    private signatures: WebhookSignatureService,
  ) {}

  @Post('webhook')

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stalwart inbound email webhook' })
  inboundWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-stalwart-signature') signature: string | undefined,
    @Body() payload: { from: string; to: string; subject?: string; sizeBytes?: number; spamScore?: number },
  ) {
    // The signature is over the bytes Stalwart signed, not over the parsed
    // body re-serialized — and it is required: a webhook without one is
    // refused, because the header is the only thing standing between the
    // internet and the ability to inject mail into any tenant's mailbox.
    this.signatures.verify(req.rawBody ?? JSON.stringify(payload), signature);
    return this.inboundService.handleInboundEmail({
      from: payload.from,
      to: payload.to,
      subject: payload.subject ?? '',
      sizeBytes: payload.sizeBytes ?? 0,
      spamScore: payload.spamScore,
    });
  }
}
