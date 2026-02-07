import { Injectable, Logger } from '@nestjs/common';
import {
  MicrosoftAuthService,
  MicrosoftGraphService,
  WebhookNotificationItem,
  OutlookEventAttendeeResponse,
} from '@microsoft/graph';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EventsRepository } from '../engagements/submodules/events/events.repository';
import { EngagementsRepository } from '../engagements/engagements.repository';
import { AttendeesRepository } from '../engagements/submodules/attendees/attendees.repository';
import { ResponseStatus } from '../engagements/submodules/attendees/entities/attendee.entity';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly microsoftAuthService: MicrosoftAuthService,
    private readonly microsoftGraphService: MicrosoftGraphService,
    private readonly eventsRepository: EventsRepository,
    private readonly engagementsRepository: EngagementsRepository,
    private readonly attendeesRepository: AttendeesRepository,
  ) {}

  async processNotification(item: WebhookNotificationItem): Promise<void> {
    const subscription = await this.subscriptionsService.findBySubscriptionId(
      item.subscriptionId,
    );

    if (!subscription) {
      this.logger.warn(
        `No subscription found for ID ${item.subscriptionId}, skipping`,
      );
      return;
    }

    if (item.clientState !== subscription.clientState) {
      this.logger.warn(
        `Client state mismatch for subscription ${item.subscriptionId}, skipping`,
      );
      return;
    }

    try {
      const tokenResult = await this.microsoftAuthService.refreshToken(
        subscription.microsoftHomeAccountId,
      );

      if (!tokenResult) {
        this.logger.warn(
          `Microsoft session expired for subscription ${item.subscriptionId}`,
        );
        return;
      }

      const eventId = this.extractEventId(item.resource);
      if (!eventId) {
        this.logger.warn(
          `Could not extract event ID from resource: ${item.resource}`,
        );
        return;
      }

      const outlookEvent = await this.microsoftGraphService.getEvent(
        tokenResult.accessToken,
        eventId,
      );

      const engagementEvent =
        await this.eventsRepository.findByExternalEventId(eventId);

      if (!engagementEvent) {
        this.logger.debug(
          `No engagement event found for external event ID ${eventId}, skipping`,
        );
        return;
      }

      const engagement = await this.engagementsRepository.findOne(
        engagementEvent.engagementId,
      );

      if (!engagement) {
        this.logger.warn(
          `Engagement ${engagementEvent.engagementId} not found`,
        );
        return;
      }

      await this.updateAttendeeResponses(
        engagement.id,
        engagement.attendees || [],
        outlookEvent.attendees || [],
      );

      this.logger.log(`Processed notification for engagement ${engagement.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to process notification for subscription ${item.subscriptionId}: ${error.message}`,
        error.stack,
      );
    }
  }

  private async updateAttendeeResponses(
    engagementId: string,
    engagementAttendees: {
      id: string;
      user?: { email: string } | null;
      expert?: { email: string } | null;
    }[],
    outlookAttendees: OutlookEventAttendeeResponse[],
  ): Promise<void> {
    for (const outlookAttendee of outlookAttendees) {
      const email = outlookAttendee.emailAddress?.address?.toLowerCase();
      if (!email) continue;

      const responseStatus = this.mapOutlookResponse(
        outlookAttendee.status?.response,
      );

      const matchingAttendee = engagementAttendees.find((a) => {
        const attendeeEmail =
          a.user?.email?.toLowerCase() || a.expert?.email?.toLowerCase();
        return attendeeEmail === email;
      });

      if (matchingAttendee) {
        await this.attendeesRepository.update(
          engagementId,
          matchingAttendee.id,
          {
            responseStatus,
          },
        );
      }
    }
  }

  private mapOutlookResponse(response: string | undefined): ResponseStatus {
    switch (response) {
      case 'accepted':
        return ResponseStatus.ACCEPTED;
      case 'declined':
        return ResponseStatus.DECLINED;
      case 'tentativelyAccepted':
        return ResponseStatus.TENTATIVE;
      default:
        return ResponseStatus.NO_RESPONSE;
    }
  }

  private extractEventId(resource: string): string | null {
    // Resource formats:
    // "me/events/{eventId}" or "me/events('{eventId}')"
    // "Users/{userId}/Events/{eventId}" or "Users('{userId}')/Events('{eventId}')"
    const patterns = [/events\/([^/]+)$/i, /events\('([^']+)'\)$/i];

    for (const pattern of patterns) {
      const match = resource.match(pattern);
      if (match) return match[1];
    }

    return null;
  }
}
