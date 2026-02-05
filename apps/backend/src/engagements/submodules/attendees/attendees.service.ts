import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendeesRepository } from './attendees.repository';
import { QueryAttendeeDto } from './dto/query-attendee.dto';
import { CreateAttendeeDto } from './dto/create-attendee.dto';
import { UpdateAttendeeDto } from './dto/update-attendee.dto';
import { PaginatedResponseDto } from '../../../common/db/base-query-dto';
import { EngagementAttendee } from './entities/attendee.entity';

@Injectable()
export class AttendeesService {
  constructor(private readonly attendeesRepository: AttendeesRepository) {}

  async findAll(
    engagementId: string,
    query: QueryAttendeeDto,
  ): Promise<PaginatedResponseDto<EngagementAttendee>> {
    const { data, totalCount } = await this.attendeesRepository.findAll(
      engagementId,
      query,
    );
    return new PaginatedResponseDto(data, totalCount, query);
  }

  async findOne(engagementId: string, id: string): Promise<EngagementAttendee> {
    const attendee = await this.attendeesRepository.findOne(engagementId, id);
    if (!attendee) {
      throw new NotFoundException(`Attendee with ID "${id}" not found`);
    }
    return attendee;
  }

  async create(
    engagementId: string,
    dto: CreateAttendeeDto,
  ): Promise<EngagementAttendee> {
    return this.attendeesRepository.create(engagementId, dto);
  }

  async update(
    engagementId: string,
    id: string,
    dto: UpdateAttendeeDto,
  ): Promise<EngagementAttendee> {
    const attendee = await this.attendeesRepository.update(
      engagementId,
      id,
      dto,
    );
    if (!attendee) {
      throw new NotFoundException(`Attendee with ID "${id}" not found`);
    }
    return attendee;
  }

  async remove(engagementId: string, id: string): Promise<void> {
    const attendee = await this.attendeesRepository.findOne(engagementId, id);
    if (!attendee) {
      throw new NotFoundException(`Attendee with ID "${id}" not found`);
    }
    await this.attendeesRepository.remove(engagementId, id);
  }
}
