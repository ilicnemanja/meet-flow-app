import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
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
} from './interfaces/microsoft-graph-subscription.interface';

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

  updateEvent() {}
  cancelEvent() {}
  getEvent() {}
  addAttendees() {}

  async subscribeToChange(
    microsoftHomeAccountId: string,
    email: string,
  ): Promise<CreateSubscriptionResponse> {
    const tokenResult = await this.microsoftAuthService.refreshToken(
      microsoftHomeAccountId,
    );

    if (!tokenResult) {
      throw new ForbiddenException('Microsoft session expired');
    }

    const accessToken = tokenResult.accessToken;

    const payload: CreateSubscriptionRequest = {
      changeType: 'updated',
      notificationUrl: this.configService.get<string>('webhookUrl'),
      resource: `/users/${email}/events`,
      expirationDateTime: '',
      clientState: '',
      latestSupportedTlsVersion: '',
    };

    const response = await axios.post<
      CreateSubscriptionRequest,
      CreateSubscriptionResponse
    >(`${this.graphBaseUrl}/subscriptions`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return response;
  }

  renewSubcription() {}
}
