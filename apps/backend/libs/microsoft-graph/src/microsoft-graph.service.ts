import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  CreateOutlookEventDto,
  OutlookEventResponse,
} from './interfaces/microsoft-graph-event.interface';

@Injectable()
export class MicrosoftGraphService {
  private readonly logger = new Logger(MicrosoftGraphService.name);
  private readonly graphBaseUrl = 'https://graph.microsoft.com/v1.0';

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
  subscribeToChange() {}
}
