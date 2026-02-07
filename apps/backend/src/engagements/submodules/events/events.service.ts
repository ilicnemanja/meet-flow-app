import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  MicrosoftAuthService,
  MicrosoftGraphService,
  CreateOutlookEventDto,
  OutlookAttendee,
} from '@microsoft/graph';
import { EventsRepository } from './events.repository';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EngagementEvent, SyncStatus } from './entities/event.entity';
import { EngagementsService } from '../../engagements.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly engagementsService: EngagementsService,
    private readonly microsoftAuthService: MicrosoftAuthService,
    private readonly microsoftGraphService: MicrosoftGraphService,
  ) {}

  async findOne(engagementId: string): Promise<EngagementEvent> {
    const event = await this.eventsRepository.findByEngagementId(engagementId);
    if (!event) {
      throw new NotFoundException(
        `Event for engagement "${engagementId}" not found`,
      );
    }
    return event;
  }

  async create(
    engagementId: string,
    dto: CreateEventDto,
    microsoftHomeAccountId: string,
  ): Promise<EngagementEvent> {
    const engagement = await this.engagementsService.findOne(engagementId);

    let event = await this.eventsRepository.create(engagementId, dto);

    try {
      const tokenResult = await this.microsoftAuthService.refreshToken(
        microsoftHomeAccountId,
      );

      if (!tokenResult) {
        this.logger.warn(
          `Microsoft session expired for engagement ${engagementId}. Event created with PENDING status.`,
        );
        return event;
      }

      const attendees: OutlookAttendee[] = (engagement.attendees || [])
        .map((attendee) => {
          if (attendee.user) {
            return {
              email: attendee.user.email,
              name: `${attendee.user.firstName} ${attendee.user.lastName}`,
            };
          }
          if (attendee.expert) {
            return {
              email: attendee.expert.email,
              name: attendee.expert.fullName,
            };
          }
          return null;
        })
        .filter(Boolean);

      const outlookEvent: CreateOutlookEventDto = {
        subject: engagement.title,
        body: engagement.description,
        start: {
          dateTime: engagement.startDateTime.toISOString(),
          timeZone: engagement.timeZone,
        },
        end: {
          dateTime: engagement.endDateTime.toISOString(),
          timeZone: engagement.timeZone,
        },
        attendees,
        isOnlineMeeting: true,
      };

      const result = await this.microsoftGraphService.createEvent(
        tokenResult.accessToken,
        outlookEvent,
      );

      event = await this.eventsRepository.update(engagementId, {
        externalEventId: result.id,
        onlineMeetingUrl: result.onlineMeeting?.joinUrl || null,
        syncStatus: SyncStatus.SYNCED,
      });
    } catch (error) {
      this.logger.error(
        `Failed to sync event to Outlook for engagement ${engagementId}: ${error.message}`,
        error.stack,
      );
      event = await this.eventsRepository.update(engagementId, {
        syncStatus: SyncStatus.FAILED,
      });
    }

    return event;
  }

  async update(
    engagementId: string,
    dto: UpdateEventDto,
  ): Promise<EngagementEvent> {
    const event = await this.eventsRepository.update(engagementId, dto);
    if (!event) {
      throw new NotFoundException(
        `Event for engagement "${engagementId}" not found`,
      );
    }
    return event;
  }

  async remove(engagementId: string): Promise<void> {
    const event = await this.eventsRepository.findByEngagementId(engagementId);
    if (!event) {
      throw new NotFoundException(
        `Event for engagement "${engagementId}" not found`,
      );
    }
    await this.eventsRepository.remove(engagementId);
  }
}
