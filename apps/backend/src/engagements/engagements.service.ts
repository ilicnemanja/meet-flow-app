import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EngagementsRepository } from './engagements.repository';
import { QueryEngagementDto } from './dto/query-engagement.dto';
import { CreateEngagementDto } from './dto/create-engagement.dto';
import { UpdateEngagementDto } from './dto/update-engagement.dto';
import { PaginatedResponseDto } from '../common/db/base-query-dto';
import { Engagement } from './entities/engagement.entity';
import { EventsService } from './submodules/events/events.service';
import { AttendeesService } from './submodules/attendees/attendees.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class EngagementsService {
  private readonly logger = new Logger(EngagementsService.name);

  constructor(
    private readonly engagementsRepository: EngagementsRepository,
    private readonly eventsService: EventsService,
    private readonly attendeesService: AttendeesService,
    private readonly usersService: UsersService,
  ) {}

  async findAll(
    query: QueryEngagementDto,
  ): Promise<PaginatedResponseDto<Engagement>> {
    const { data, totalCount } =
      await this.engagementsRepository.findAll(query);
    return new PaginatedResponseDto(data, totalCount, query);
  }

  async findOne(id: string): Promise<Engagement> {
    const engagement = await this.engagementsRepository.findOne(id);
    if (!engagement) {
      throw new NotFoundException(`Engagement with ID "${id}" not found`);
    }
    return engagement;
  }

  async create(
    dto: CreateEngagementDto,
    microsoftHomeAccountId?: string,
    userEmail?: string,
  ): Promise<Engagement> {
    const { attendees, ...engagementData } = dto;

    const user = await this.usersService.findByEmail(userEmail);

    const engagement = await this.engagementsRepository.create({
      ...engagementData,
      organizerEmail: user.email,
    });

    if (attendees?.length) {
      await Promise.all(
        attendees.map((attendee) =>
          this.attendeesService.create(engagement.id, attendee),
        ),
      );
    }

    const fullEngagement = await this.engagementsRepository.findOne(
      engagement.id,
    );

    if (dto.startDateTime && dto.endDateTime && microsoftHomeAccountId) {
      try {
        const event = await this.eventsService.createEventRecord(engagement.id);

        await this.eventsService.scheduleInOutlook(
          fullEngagement,
          event,
          microsoftHomeAccountId,
        );

        return this.engagementsRepository.findOne(engagement.id);
      } catch (error) {
        this.logger.error(
          `Failed to auto-schedule engagement ${engagement.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    return fullEngagement;
  }

  async update(id: string, dto: UpdateEngagementDto): Promise<Engagement> {
    const engagement = await this.engagementsRepository.update(id, dto);
    if (!engagement) {
      throw new NotFoundException(`Engagement with ID "${id}" not found`);
    }
    return engagement;
  }

  async remove(id: string): Promise<void> {
    const engagement = await this.engagementsRepository.findOne(id);
    if (!engagement) {
      throw new NotFoundException(`Engagement with ID "${id}" not found`);
    }
    await this.engagementsRepository.remove(id);
  }
}
