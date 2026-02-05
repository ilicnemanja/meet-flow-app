import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SendEmailDto } from './dto/send-email.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { CalendarEventDto } from './dto/calendar-event.dto';
import { EmailMessageDto, EmailMessageDetailDto } from './dto/email-message.dto';

@Injectable()
export class MicrosoftService {
  constructor(private configService: ConfigService) {}

  async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
  ): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    try {
      const response = await axios.post(
        'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
        new URLSearchParams({
          client_id: this.configService.get<string>('MICROSOFT_CLIENT_ID')!,
          client_secret: this.configService.get<string>('MICROSOFT_CLIENT_SECRET')!,
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.configService.get<string>('MICROSOFT_REDIRECT_URI')!,
          code_verifier: codeVerifier,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error: any) {
      console.error('Token exchange failed:', error.response?.data || error);
      throw new BadRequestException('Failed to exchange authorization code');
    }
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const response = await axios.post(
        'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
        new URLSearchParams({
          client_id: this.configService.get<string>('MICROSOFT_CLIENT_ID')!,
          client_secret: this.configService.get<string>('MICROSOFT_CLIENT_SECRET')!,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error: any) {
      console.error('Token refresh failed:', error.response?.data || error);
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  async getUserProfile(accessToken: string): Promise<UserProfileDto> {
    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = response.data;

      // Try to fetch user photo
      let photoUrl: string | undefined;
      try {
        const photoResponse = await axios.get(
          'https://graph.microsoft.com/v1.0/me/photo/$value',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            responseType: 'arraybuffer',
          },
        );

        // Convert image to base64 data URL
        const base64 = Buffer.from(photoResponse.data, 'binary').toString('base64');
        const contentType = photoResponse.headers['content-type'] || 'image/jpeg';
        photoUrl = `data:${contentType};base64,${base64}`;
      } catch (photoError) {
        // Photo might not exist, that's okay
        console.log('User photo not available');
      }

      return {
        id: data.id,
        displayName: data.displayName,
        email: data.mail || data.userPrincipalName,
        jobTitle: data.jobTitle,
        officeLocation: data.officeLocation,
        mobilePhone: data.mobilePhone,
        businessPhones: data.businessPhones,
        photoUrl,
      };
    } catch (error: any) {
      console.error('Get user profile failed:', error.response?.data || error);
      throw new UnauthorizedException('Failed to fetch user profile');
    }
  }

  async sendEmail(accessToken: string, emailData: SendEmailDto): Promise<void> {
    try {
      await axios.post(
        'https://graph.microsoft.com/v1.0/me/sendMail',
        {
          message: {
            subject: emailData.subject,
            body: {
              contentType: emailData.contentType || 'Text',
              content: emailData.body,
            },
            toRecipients: emailData.to.map((recipient) => ({
              emailAddress: {
                address: recipient.email,
                name: recipient.name,
              },
            })),
          },
          saveToSentItems: true,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error: any) {
      console.error('Send email failed:', error.response?.data || error);
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to send email',
      );
    }
  }

  async getCalendarEvents(
    accessToken: string,
    startDate?: string,
    endDate?: string,
  ): Promise<CalendarEventDto[]> {
    try {
      let url = 'https://graph.microsoft.com/v1.0/me/calendar/events';
      const params = new URLSearchParams();

      if (startDate && endDate) {
        params.append('$filter', `start/dateTime ge '${startDate}' and end/dateTime le '${endDate}'`);
      }

      params.append('$orderby', 'start/dateTime');
      params.append('$top', '100');

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'outlook.timezone="UTC"',
        },
      });

      return response.data.value.map((event: any) => ({
        id: event.id,
        subject: event.subject,
        startDateTime: event.start.dateTime,
        endDateTime: event.end.dateTime,
        location: event.location?.displayName,
        body: event.bodyPreview || event.body?.content,
        organizer: event.organizer?.emailAddress
          ? {
              name: event.organizer.emailAddress.name,
              email: event.organizer.emailAddress.address,
            }
          : undefined,
        attendees: event.attendees?.map((attendee: any) => ({
          name: attendee.emailAddress.name,
          email: attendee.emailAddress.address,
          status: attendee.status.response,
        })),
        isAllDay: event.isAllDay || false,
        isCancelled: event.isCancelled || false,
      }));
    } catch (error: any) {
      console.error('Get calendar events failed:', error.response?.data || error);
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to fetch calendar events',
      );
    }
  }

  async getCalendarEvent(
    accessToken: string,
    eventId: string,
  ): Promise<CalendarEventDto> {
    try {
      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/me/calendar/events/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'outlook.timezone="UTC"',
          },
        },
      );

      const event = response.data;
      return {
        id: event.id,
        subject: event.subject,
        startDateTime: event.start.dateTime,
        endDateTime: event.end.dateTime,
        location: event.location?.displayName,
        body: event.bodyPreview || event.body?.content,
        organizer: event.organizer?.emailAddress
          ? {
              name: event.organizer.emailAddress.name,
              email: event.organizer.emailAddress.address,
            }
          : undefined,
        attendees: event.attendees?.map((attendee: any) => ({
          name: attendee.emailAddress.name,
          email: attendee.emailAddress.address,
          status: attendee.status.response,
        })),
        isAllDay: event.isAllDay || false,
        isCancelled: event.isCancelled || false,
      };
    } catch (error: any) {
      console.error('Get calendar event failed:', error.response?.data || error);
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to fetch calendar event',
      );
    }
  }

  async createCalendarEvent(
    accessToken: string,
    eventData: CreateEventDto,
  ): Promise<CalendarEventDto> {
    try {
      const timeZone = eventData.timeZone || 'UTC';

      const payload: any = {
        subject: eventData.subject,
        start: {
          dateTime: eventData.startDateTime,
          timeZone,
        },
        end: {
          dateTime: eventData.endDateTime,
          timeZone,
        },
      };

      if (eventData.location) {
        payload.location = {
          displayName: eventData.location,
        };
      }

      if (eventData.body) {
        payload.body = {
          contentType: 'Text',
          content: eventData.body,
        };
      }

      if (eventData.attendees && eventData.attendees.length > 0) {
        payload.attendees = eventData.attendees.map((attendee) => ({
          emailAddress: {
            address: attendee.email,
            name: attendee.name || attendee.email,
          },
          type: 'required',
        }));
      }

      const response = await axios.post(
        'https://graph.microsoft.com/v1.0/me/calendar/events',
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const event = response.data;
      return {
        id: event.id,
        subject: event.subject,
        startDateTime: event.start.dateTime,
        endDateTime: event.end.dateTime,
        location: event.location?.displayName,
        body: event.bodyPreview || event.body?.content,
        organizer: event.organizer?.emailAddress
          ? {
              name: event.organizer.emailAddress.name,
              email: event.organizer.emailAddress.address,
            }
          : undefined,
        attendees: event.attendees?.map((attendee: any) => ({
          name: attendee.emailAddress.name,
          email: attendee.emailAddress.address,
          status: attendee.status.response,
        })),
        isAllDay: event.isAllDay || false,
        isCancelled: event.isCancelled || false,
      };
    } catch (error: any) {
      console.error('Create calendar event failed:', error.response?.data || error);
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to create calendar event',
      );
    }
  }

  async deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
    try {
      await axios.delete(
        `https://graph.microsoft.com/v1.0/me/calendar/events/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
    } catch (error: any) {
      console.error('Delete calendar event failed:', error.response?.data || error);
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to delete calendar event',
      );
    }
  }

  async getInboxMessages(
    accessToken: string,
    top: number = 50,
    skip: number = 0,
  ): Promise<{ messages: EmailMessageDto[]; totalCount: number }> {
    try {
      const url = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages`;
      const params = new URLSearchParams({
        $top: top.toString(),
        $skip: skip.toString(),
        $orderby: 'receivedDateTime desc',
        $select: 'id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,hasAttachments,importance,conversationId',
      });

      const response = await axios.get(`${url}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const messages: EmailMessageDto[] = response.data.value.map((msg: any) => ({
        id: msg.id,
        subject: msg.subject || '(No subject)',
        bodyPreview: msg.bodyPreview || '',
        from: {
          name: msg.from?.emailAddress?.name,
          email: msg.from?.emailAddress?.address,
        },
        toRecipients: msg.toRecipients?.map((recipient: any) => ({
          name: recipient.emailAddress?.name,
          email: recipient.emailAddress?.address,
        })) || [],
        receivedDateTime: msg.receivedDateTime,
        isRead: msg.isRead || false,
        hasAttachments: msg.hasAttachments || false,
        importance: msg.importance || 'normal',
        conversationId: msg.conversationId,
      }));

      // Get total count
      const countResponse = await axios.get(
        'https://graph.microsoft.com/v1.0/me/mailFolders/inbox',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return {
        messages,
        totalCount: countResponse.data.totalItemCount || messages.length,
      };
    } catch (error: any) {
      console.error('Get inbox messages failed:', error.response?.data || error);
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to fetch inbox messages',
      );
    }
  }

  async getMessage(accessToken: string, messageId: string): Promise<EmailMessageDetailDto> {
    try {
      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const msg = response.data;
      return {
        id: msg.id,
        subject: msg.subject || '(No subject)',
        body: {
          contentType: msg.body?.contentType || 'text',
          content: msg.body?.content || '',
        },
        from: {
          name: msg.from?.emailAddress?.name,
          email: msg.from?.emailAddress?.address,
        },
        toRecipients: msg.toRecipients?.map((recipient: any) => ({
          name: recipient.emailAddress?.name,
          email: recipient.emailAddress?.address,
        })) || [],
        ccRecipients: msg.ccRecipients?.map((recipient: any) => ({
          name: recipient.emailAddress?.name,
          email: recipient.emailAddress?.address,
        })),
        bccRecipients: msg.bccRecipients?.map((recipient: any) => ({
          name: recipient.emailAddress?.name,
          email: recipient.emailAddress?.address,
        })),
        receivedDateTime: msg.receivedDateTime,
        sentDateTime: msg.sentDateTime,
        isRead: msg.isRead || false,
        hasAttachments: msg.hasAttachments || false,
        importance: msg.importance || 'normal',
        conversationId: msg.conversationId,
      };
    } catch (error: any) {
      console.error('Get message failed:', error.response?.data || error);
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to fetch message',
      );
    }
  }

  async markMessageAsRead(accessToken: string, messageId: string, isRead: boolean): Promise<void> {
    try {
      await axios.patch(
        `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
        {
          isRead,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error: any) {
      console.error('Mark message as read failed:', error.response?.data || error);
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to update message',
      );
    }
  }
}
