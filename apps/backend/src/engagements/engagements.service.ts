import { Injectable, NotFoundException } from '@nestjs/common';
import { EngagementsRepository } from './engagements.repository';
import { QueryEngagementDto } from './dto/query-engagement.dto';
import { CreateEngagementDto } from './dto/create-engagement.dto';
import { UpdateEngagementDto } from './dto/update-engagement.dto';
import { PaginatedResponseDto } from '../common/db/base-query-dto';
import { Engagement } from './entities/engagement.entity';

@Injectable()
export class EngagementsService {
  constructor(private readonly engagementsRepository: EngagementsRepository) {}

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

  async create(dto: CreateEngagementDto): Promise<Engagement> {
    return this.engagementsRepository.create(dto);
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
