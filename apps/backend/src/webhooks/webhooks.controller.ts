import {
  Controller,
  Post,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { WebhooksService } from './webhooks.service';
import { WebhookNotificationPayload } from '@microsoft/graph';

@ApiTags('Webhooks')
@Public()
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('microsoft')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Microsoft Graph webhook endpoint for subscription notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation token returned (subscription validation)',
  })
  @ApiResponse({
    status: 202,
    description: 'Notification accepted for processing',
  })
  async handleNotification(
    @Query('validationToken') validationToken: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Microsoft Graph subscription validation handshake
    if (validationToken) {
      this.logger.log('Received subscription validation request');
      return res
        .status(HttpStatus.OK)
        .contentType('text/plain')
        .send(validationToken);
    }

    // Respond immediately — Microsoft requires response within 3 seconds
    res.status(HttpStatus.ACCEPTED).send();

    // Process notifications in the background
    const body = req.body as WebhookNotificationPayload;
    if (body?.value?.length) {
      this.logger.log(
        `Received ${body.value.length} notification(s) from Microsoft Graph`,
      );

      for (const notification of body.value) {
        await this.webhooksService.processNotification(notification);
      }
    }
  }
}
