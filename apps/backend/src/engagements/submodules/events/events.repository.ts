import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EngagementEvent } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsRepository {
  constructor(
    @InjectRepository(EngagementEvent)
    private readonly repository: Repository<EngagementEvent>,
  ) {}

  async findByEngagementId(
    engagementId: string,
  ): Promise<EngagementEvent | null> {
    return this.repository.findOne({
      where: { engagementId },
    });
  }

  async create(
    engagementId: string,
    dto: CreateEventDto,
  ): Promise<EngagementEvent> {
    const event = this.repository.create({ ...dto, engagementId });
    return this.repository.save(event);
  }

  async update(
    engagementId: string,
    dto: UpdateEventDto,
  ): Promise<EngagementEvent | null> {
    await this.repository.update({ engagementId }, dto);
    return this.findByEngagementId(engagementId);
  }

  async remove(engagementId: string): Promise<void> {
    await this.repository.softDelete({ engagementId });
  }
}
