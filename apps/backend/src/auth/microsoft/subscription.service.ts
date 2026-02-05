import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStore } from './subscription.store';
import {
  CreateSubscriptionDto,
  SubscriptionResponseDto,
} from './dto/subscription.dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly graphApiUrl = 'https://graph.microsoft.com/v1.0';
  private readonly webhookBaseUrl: string;

  constructor(
    private readonly subscriptionStore: SubscriptionStore,
    private readonly configService: ConfigService,
  ) {
    this.webhookBaseUrl = this.configService.get<string>('WEBHOOK_BASE_URL') || 'http://localhost:3000';
  }

  /**
   * Create a new Microsoft Graph subscription for calendar events
   */
  async createSubscription(
    accessToken: string,
    userId: string,
  ): Promise<SubscriptionResponseDto> {
    try {
      // Generate client state for validation
      const clientState = this.subscriptionStore.createSubscription(
        '', // Will be updated with actual subscriptionId
        userId,
        '/me/calendar/events',
        new Date(), // Will be updated with actual expiration
      );

      // Calculate expiration: 70.5 hours from now (max allowed by Microsoft Graph)
      const expirationDate = new Date();
      expirationDate.setMinutes(expirationDate.getMinutes() + 4230);

      const subscriptionData: CreateSubscriptionDto = {
        changeType: 'created,updated,deleted',
        notificationUrl: `${this.webhookBaseUrl}/auth/microsoft/webhook/notifications`,
        resource: '/me/calendar/events',
        expirationDateTime: expirationDate.toISOString(),
        clientState,
      };

      this.logger.log(`Creating subscription for user ${userId}`);
      this.logger.debug(`Subscription data: ${JSON.stringify(subscriptionData)}`);

      const response = await fetch(`${this.graphApiUrl}/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Failed to create subscription: ${response.status} ${errorText}`);
        throw new Error(`Failed to create subscription: ${response.status}`);
      }

      const subscription: SubscriptionResponseDto = await response.json();

      // Update store with actual subscription ID and expiration
      this.subscriptionStore.createSubscription(
        subscription.id,
        userId,
        subscription.resource,
        new Date(subscription.expirationDateTime),
        clientState,
      );

      // Schedule renewal 1 hour before expiration
      this.scheduleRenewal(subscription.id, userId, accessToken, new Date(subscription.expirationDateTime));

      this.logger.log(`Subscription created: ${subscription.id} for user ${userId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Error creating subscription: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Renew an existing subscription
   */
  async renewSubscription(
    accessToken: string,
    subscriptionId: string,
  ): Promise<SubscriptionResponseDto> {
    try {
      // Calculate new expiration: 70.5 hours from now
      const expirationDate = new Date();
      expirationDate.setMinutes(expirationDate.getMinutes() + 4230);

      this.logger.log(`Renewing subscription: ${subscriptionId}`);

      const response = await fetch(`${this.graphApiUrl}/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expirationDateTime: expirationDate.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Failed to renew subscription: ${response.status} ${errorText}`);
        throw new Error(`Failed to renew subscription: ${response.status}`);
      }

      const subscription: SubscriptionResponseDto = await response.json();

      // Update store with new expiration
      this.subscriptionStore.updateExpiration(
        subscription.id,
        new Date(subscription.expirationDateTime),
      );

      this.logger.log(`Subscription renewed: ${subscription.id}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Error renewing subscription: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(
    accessToken: string,
    subscriptionId: string,
  ): Promise<void> {
    try {
      this.logger.log(`Deleting subscription: ${subscriptionId}`);

      const response = await fetch(`${this.graphApiUrl}/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();
        this.logger.error(`Failed to delete subscription: ${response.status} ${errorText}`);
        throw new Error(`Failed to delete subscription: ${response.status}`);
      }

      // Remove from store
      this.subscriptionStore.deleteSubscription(subscriptionId);

      this.logger.log(`Subscription deleted: ${subscriptionId}`);
    } catch (error) {
      this.logger.error(`Error deleting subscription: ${error.message}`, error.stack);
      // Don't throw - allow graceful degradation
    }
  }

  /**
   * Delete subscription by user ID
   */
  async deleteSubscriptionByUserId(
    accessToken: string,
    userId: string,
  ): Promise<void> {
    const subscription = this.subscriptionStore.getSubscriptionByUserId(userId);
    if (subscription) {
      await this.deleteSubscription(accessToken, subscription.subscriptionId);
    }
  }

  /**
   * Schedule automatic renewal 1 hour before expiration
   */
  private scheduleRenewal(
    subscriptionId: string,
    userId: string,
    accessToken: string,
    expirationDate: Date,
  ): void {
    // Schedule renewal 1 hour before expiration
    const renewalTime = new Date(expirationDate.getTime() - 60 * 60 * 1000);
    const delayMs = renewalTime.getTime() - Date.now();

    if (delayMs > 0) {
      const timeoutId = setTimeout(async () => {
        try {
          this.logger.log(`Auto-renewing subscription: ${subscriptionId}`);
          const renewed = await this.renewSubscription(accessToken, subscriptionId);

          // Schedule next renewal
          this.scheduleRenewal(
            renewed.id,
            userId,
            accessToken,
            new Date(renewed.expirationDateTime),
          );
        } catch (error) {
          this.logger.error(`Failed to auto-renew subscription ${subscriptionId}: ${error.message}`);
          // Subscription will need to be recreated on next calendar page load
          this.subscriptionStore.deleteSubscription(subscriptionId);
        }
      }, delayMs);

      // Store timeout ID for cleanup
      this.subscriptionStore.setRenewalTimeout(subscriptionId, timeoutId);

      this.logger.log(`Renewal scheduled for subscription ${subscriptionId} at ${renewalTime.toISOString()}`);
    }
  }

  /**
   * Validate notification client state
   */
  validateNotification(subscriptionId: string, clientState: string): boolean {
    const subscription = this.subscriptionStore.getSubscription(subscriptionId);
    if (!subscription) {
      this.logger.warn(`Subscription not found: ${subscriptionId}`);
      return false;
    }

    if (subscription.clientState !== clientState) {
      this.logger.warn(`Invalid client state for subscription: ${subscriptionId}`);
      return false;
    }

    return true;
  }
}
