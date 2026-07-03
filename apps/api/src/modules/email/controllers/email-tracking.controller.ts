/**
 * Tracking endpoints — open pixel + click redirect.
 * These are PUBLIC (no auth) since they're hit by email clients.
 */
import { Controller, Get, Param, Query, Res, Req, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { EmailTrackingService } from '@/modules/email/services/email-tracking.service';

@ApiTags('email-tracking')
@Controller('email/t')
export class EmailTrackingController {
  constructor(private tracking: EmailTrackingService) {}

  @Get('open/:messageId')
  @Header('Content-Type', 'image/gif')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  async trackOpen(
    @Param('messageId') messageId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const pixel = await this.tracking.recordOpen(messageId, {
      userAgent: req.headers['user-agent'],
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip,
    });
    res.end(pixel);
  }

  @Get('click/:messageId')
  async trackClick(
    @Param('messageId') messageId: string,
    @Query('url') url: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!url) {
      res.redirect('/');
      return;
    }
    const dest = await this.tracking.recordClick(messageId, url, {
      userAgent: req.headers['user-agent'],
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip,
    });
    res.redirect(302, dest);
  }
}
