import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EngagementAttendee } from './entities/attendee.entity';
import { QueryAttendeeDto } from './dto/query-attendee.dto';
import { CreateAttendeeDto } from './dto/create-attendee.dto';
import { UpdateAttendeeDto } from './dto/update-attendee.dto';

@Injectable()
export class AttendeesRepository {
  constructor(
    @InjectRepository(EngagementAttendee)
    private readonly repository: Repository<EngagementAttendee>,
  ) {}

  async findAll(
    engagementId: string,
    query: QueryAttendeeDto,
  ): Promise<{ data: EngagementAttendee[]; totalCount: number }> {
    const where: any = { engagementId };

    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.expertId) {
      where.expertId = query.expertId;
    }
    if (query.responseStatus) {
      where.responseStatus = query.responseStatus;
    }

    const [data, totalCount] = await this.repository.findAndCount({
      where,
      skip: query.offset,
      take: query.limit,
      order: { createdAt: 'DESC' },
      relations: ['user', 'expert'],
    });

    return { data, totalCount };
  }

  async findOne(
    engagementId: string,
    id: string,
  ): Promise<EngagementAttendee | null> {
    return this.repository.findOne({
      where: { id, engagementId },
      relations: ['user', 'expert'],
    });
  }

  async create(
    engagementId: string,
    dto: CreateAttendeeDto,
  ): Promise<EngagementAttendee> {
    const attendee = this.repository.create({ ...dto, engagementId });
    return this.repository.save(attendee);
  }

  async update(
    engagementId: string,
    id: string,
    dto: UpdateAttendeeDto,
  ): Promise<EngagementAttendee | null> {
    await this.repository.update({ id, engagementId }, dto);
    return this.findOne(engagementId, id);
  }

  async remove(engagementId: string, id: string): Promise<void> {
    await this.repository.softDelete({ id, engagementId });
  }
}
