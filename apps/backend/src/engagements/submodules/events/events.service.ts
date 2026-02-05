import { Injectable, NotFoundException } from '@nestjs/common';
import { EventsRepository } from './events.repository';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EngagementEvent } from './entities/event.entity';

@Injectable()
export class EventsService {
  constructor(private readonly eventsRepository: EventsRepository) {}

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
  ): Promise<EngagementEvent> {
    return this.eventsRepository.create(engagementId, dto);
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
