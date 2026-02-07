import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import axios from 'axios';
import {
  CreateOutlookEventDto,
  OutlookEventResponse,
} from './interfaces/microsoft-graph-event.interface';
import { MicrosoftAuthService } from './auth/microsoft-auth.service';
import { ConfigService } from '@nestjs/config';
import {
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  SubscribeToChangeResult,
  OutlookEventWithAttendees,
} from './interfaces/microsoft-graph-subscription.interface';

const MAX_SUBSCRIPTION_LIFETIME_MINUTES = 4230;

@Injectable()
export class MicrosoftGraphService {
  private readonly logger = new Logger(MicrosoftGraphService.name);
  private readonly graphBaseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(
    private readonly microsoftAuthService: MicrosoftAuthService,
    private readonly configService: ConfigService,
  ) {}

  async createEvent(
    accessToken: string,
    eventData: CreateOutlookEventDto,
  ): Promise<OutlookEventResponse> {
    const payload = {
      subject: eventData.subject,
      body: eventData.body
        ? { contentType: 'HTML', content: eventData.body }
        : undefined,
      start: {
        dateTime: eventData.start.dateTime,
        timeZone: eventData.start.timeZone,
      },
      end: {
        dateTime: eventData.end.dateTime,
        timeZone: eventData.end.timeZone,
      },
      attendees: eventData.attendees?.map((attendee) => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.name,
        },
        type: 'required',
      })),
      isOnlineMeeting: eventData.isOnlineMeeting,
      onlineMeetingProvider: eventData.isOnlineMeeting
        ? 'teamsForBusiness'
        : undefined,
    };

    this.logger.log(`Creating Outlook event: ${eventData.subject}`);

    const response = await axios.post(
      `${this.graphBaseUrl}/me/events`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return {
      id: response.data.id,
      subject: response.data.subject,
      webLink: response.data.webLink,
      onlineMeeting: response.data.onlineMeeting,
    };
  }

  async getEvent(
    accessToken: string,
    eventId: string,
  ): Promise<OutlookEventWithAttendees> {
    const response = await axios.get<OutlookEventWithAttendees>(
      `${this.graphBaseUrl}/me/events/${eventId}`,
      {
        params: { $select: 'id,subject,attendees' },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.data;
  }

  async subscribeToChange(
    microsoftHomeAccountId: string,
  ): Promise<SubscribeToChangeResult> {
    const tokenResult = await this.microsoftAuthService.refreshToken(
      microsoftHomeAccountId,
    );

    if (!tokenResult) {
      throw new ForbiddenException('Microsoft session expired');
    }

    const clientState = randomUUID();
    const expirationDateTime = new Date(
      Date.now() + MAX_SUBSCRIPTION_LIFETIME_MINUTES * 60 * 1000,
    ).toISOString();

    const payload: CreateSubscriptionRequest = {
      changeType: 'updated',
      notificationUrl: `${this.configService.get<string>('webhookUrl')}/webhooks/microsoft`,
      resource: 'me/events',
      expirationDateTime,
      clientState,
    };

    this.logger.log(
      `Creating Graph subscription for account ${microsoftHomeAccountId}`,
    );
    this.logger.debug(`Subscription payload: ${JSON.stringify(payload)}`);

    try {
      const response = await axios.post<CreateSubscriptionResponse>(
        `${this.graphBaseUrl}/subscriptions`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${tokenResult.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return { subscription: response.data, clientState };
    } catch (error) {
      this.logger.error(
        `Graph subscription creation failed: ${JSON.stringify(error.response?.data)}`,
      );
      throw error;
    }
  }

  async renewSubscription(
    microsoftHomeAccountId: string,
    subscriptionId: string,
  ): Promise<CreateSubscriptionResponse> {
    const tokenResult = await this.microsoftAuthService.refreshToken(
      microsoftHomeAccountId,
    );

    if (!tokenResult) {
      throw new ForbiddenException('Microsoft session expired');
    }

    const expirationDateTime = new Date(
      Date.now() + MAX_SUBSCRIPTION_LIFETIME_MINUTES * 60 * 1000,
    ).toISOString();

    this.logger.log(`Renewing Graph subscription ${subscriptionId}`);

    const response = await axios.patch<CreateSubscriptionResponse>(
      `${this.graphBaseUrl}/subscriptions/${subscriptionId}`,
      { expirationDateTime },
      {
        headers: {
          Authorization: `Bearer ${tokenResult.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  updateEvent() {}
  cancelEvent() {}
  addAttendees() {}
}
