import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
import { EngagementsRepository } from '../../engagements.repository';
import { Engagement, EngagementStatus } from '../../entities/engagement.entity';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly engagementsRepository: EngagementsRepository,
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

  async createEventRecord(engagementId: string): Promise<EngagementEvent> {
    return this.eventsRepository.create(engagementId, {});
  }

  async create(
    engagementId: string,
    dto: CreateEventDto,
    microsoftHomeAccountId: string,
  ): Promise<EngagementEvent> {
    const engagement = await this.engagementsRepository.findOne(engagementId);
    if (!engagement) {
      throw new NotFoundException(
        `Engagement with ID "${engagementId}" not found`,
      );
    }

    if (!engagement.startDateTime || !engagement.endDateTime) {
      throw new BadRequestException(
        'Engagement must have startDateTime and endDateTime to schedule an event. Update the engagement first.',
      );
    }

    if (engagement.status === EngagementStatus.SCHEDULED) {
      throw new ConflictException(
        'Engagement is already scheduled. Cannot create another event.',
      );
    }

    if (engagement.status === EngagementStatus.COMPLETED) {
      throw new ConflictException(
        'Engagement is already completed. Cannot schedule a new event.',
      );
    }

    const event = await this.eventsRepository.create(engagementId, dto);

    return this.scheduleInOutlook(engagement, event, microsoftHomeAccountId);
  }

  async scheduleInOutlook(
    engagement: Engagement,
    event: EngagementEvent,
    microsoftHomeAccountId: string,
  ): Promise<EngagementEvent> {
    try {
      const tokenResult = await this.microsoftAuthService.refreshToken(
        microsoftHomeAccountId,
      );

      if (!tokenResult) {
        this.logger.warn(
          `Microsoft session expired for engagement ${engagement.id}. Event created with PENDING status.`,
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

      const updatedEvent = await this.eventsRepository.update(
        event.engagementId,
        {
          externalEventId: result.id,
          onlineMeetingUrl: result.onlineMeeting?.joinUrl || null,
          syncStatus: SyncStatus.SYNCED,
        },
      );

      await this.engagementsRepository.update(engagement.id, {
        status: EngagementStatus.SCHEDULED,
      });

      return updatedEvent;
    } catch (error) {
      this.logger.error(
        `Failed to sync event to Outlook for engagement ${engagement.id}: ${error.message}`,
        error.stack,
      );

      return this.eventsRepository.update(event.engagementId, {
        syncStatus: SyncStatus.FAILED,
      });
    }
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
