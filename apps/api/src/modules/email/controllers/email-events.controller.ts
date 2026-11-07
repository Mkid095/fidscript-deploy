import {
  Controller, Post, Headers, Body, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { EmailInboundService } from '@/modules/email/services/inbound.service';
import { WebhookSignatureService } from '@/modules/email/services/webhook-signature.service';
import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('email-events')
@Controller('email/events')
export class EmailEventsController {
  constructor(
    private inboundService: EmailInboundService,
    private signatures: WebhookSignatureService,
  ) {}

  @Post('bounce')

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stalwart bounce webhook — updates message status' })
  handleBounce(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-stalwart-signature') signature: string | undefined,
    @Body() payload: { messageId: string; to: string; error: string; code?: string },
  ) {
    // The signature is required, and it is over the bytes Stalwart signed.
    this.signatures.verify(req.rawBody ?? JSON.stringify(payload), signature);
    return this.inboundService.handleBounce(payload);
  }

  @Post('complaint')

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stalwart complaint (FBL) webhook — adds recipient to suppression list' })
  handleComplaint(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-stalwart-signature') signature: string | undefined,
    @Body() payload: { email: string; userAgent?: string },
  ) {
    // The signature is required, and it is over the bytes Stalwart signed.
    this.signatures.verify(req.rawBody ?? JSON.stringify(payload), signature);
    return this.inboundService.handleComplaint(payload);
  }
}
