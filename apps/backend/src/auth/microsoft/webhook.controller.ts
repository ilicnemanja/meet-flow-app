import {
  Controller,
  Post,
  Query,
  Logger,
  HttpCode,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SubscriptionService } from './subscription.service';
import { SubscriptionStore } from './subscription.store';
import { SessionStore } from './session.store';
import { MicrosoftService } from './microsoft.service';
import { NotificationItemDto } from './dto/subscription.dto';
import { CalendarGateway } from './calendar.gateway';

@Controller('auth/microsoft/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly subscriptionStore: SubscriptionStore,
    private readonly sessionStore: SessionStore,
    private readonly microsoftService: MicrosoftService,
    private readonly calendarGateway: CalendarGateway,
  ) {}

  /**
   * Webhook endpoint for Microsoft Graph notifications
   * Also handles validation token during subscription creation
   * Note: We use @Req() to bypass global ValidationPipe since Microsoft Graph
   * sends notifications in a specific format that doesn't need validation
   */
  @Post('notifications')
  @HttpCode(HttpStatus.OK)
  async handleNotification(
    @Query('validationToken') validationToken: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Handle validation token (sent during subscription creation)
    if (validationToken) {
      this.logger.log('[WEBHOOK] Received validation request');
      res.status(HttpStatus.OK).contentType('text/plain').send(validationToken);
      return;
    }

    // Get notification from raw request body (bypass ValidationPipe)
    const notification = req.body;

    // Process notifications
    try {
      this.logger.log(`[WEBHOOK] Received notification with ${notification?.value?.length || 0} items`);
      this.logger.debug(`[WEBHOOK] Notification body: ${JSON.stringify(notification)}`);

      if (!notification?.value || notification.value.length === 0) {
        res.status(HttpStatus.OK).send();
        return;
      }

      // Process each notification asynchronously
      // Don't await - respond to Microsoft immediately
      this.processNotifications(notification.value).catch(error => {
        this.logger.error(`[WEBHOOK] Error processing notifications: ${error.message}`, error.stack);
      });

      res.status(HttpStatus.OK).send();
    } catch (error) {
      this.logger.error(`[WEBHOOK] Error handling notification: ${error.message}`, error.stack);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send();
    }
  }

  /**
   * Process notifications asynchronously
   */
  private async processNotifications(notifications: NotificationItemDto[]): Promise<void> {
    for (const item of notifications) {
      try {
        await this.processNotificationItem(item);
      } catch (error) {
        this.logger.error(`[WEBHOOK] Error processing notification item: ${error.message}`, error.stack);
      }
    }
  }

  /**
   * Process a single notification item
   */
  private async processNotificationItem(item: NotificationItemDto): Promise<void> {
    this.logger.log(`[WEBHOOK] Processing ${item.changeType} notification for subscription ${item.subscriptionId}`);

    // Validate client state
    const isValid = this.subscriptionService.validateNotification(
      item.subscriptionId,
      item.clientState,
    );

    if (!isValid) {
      this.logger.warn(`[WEBHOOK] Invalid notification for subscription ${item.subscriptionId}`);
      return;
    }

    // Get subscription to find user ID
    const subscription = this.subscriptionStore.getSubscription(item.subscriptionId);
    if (!subscription) {
      this.logger.warn(`[WEBHOOK] Subscription not found: ${item.subscriptionId}`);
      return;
    }

    // Get user session for access token
    const userSessionData = this.sessionStore.getUserSessionByUserId(subscription.userId);
    if (!userSessionData) {
      this.logger.warn(`[WEBHOOK] User session not found for user: ${subscription.userId}`);
      return;
    }

    // Extract event ID from resource URL
    // Resource format: "Users/{userId}/Events/{eventId}"
    const eventIdMatch = item.resource.match(/Events\/([^\/]+)/);
    const eventId = eventIdMatch ? eventIdMatch[1] : item.resourceData.id;

    if (!eventId) {
      this.logger.error(`[WEBHOOK] Could not extract event ID from resource: ${item.resource}`);
      return;
    }

    // Prepare calendar update
    let calendarUpdate: any;

    if (item.changeType === 'deleted') {
      // For deleted events, just send the ID and deleted flag
      calendarUpdate = {
        id: eventId,
        deleted: true,
        changeType: 'deleted',
      };
    } else {
      // For created/updated events, fetch the full event data
      try {
        const event = await this.microsoftService.getCalendarEvent(
          userSessionData.session.accessToken,
          eventId,
        );
        calendarUpdate = {
          ...event,
          changeType: item.changeType,
        };
      } catch (error) {
        this.logger.error(`[WEBHOOK] Failed to fetch event ${eventId}: ${error.message}`);
        return;
      }
    }

    this.logger.log(`[WEBHOOK] Broadcasting ${item.changeType} update for event ${eventId} to user ${subscription.userId}`);

    // Broadcast to WebSocket clients via CalendarGateway
    this.calendarGateway.broadcastCalendarUpdate(subscription.userId, calendarUpdate);
  }
}
