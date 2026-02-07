import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Engagement } from './entities/engagement.entity';
import { QueryEngagementDto } from './dto/query-engagement.dto';
import { CreateEngagementDto } from './dto/create-engagement.dto';
import { UpdateEngagementDto } from './dto/update-engagement.dto';

@Injectable()
export class EngagementsRepository {
  constructor(
    @InjectRepository(Engagement)
    private readonly repository: Repository<Engagement>,
  ) {}

  async findAll(
    query: QueryEngagementDto,
  ): Promise<{ data: Engagement[]; totalCount: number }> {
    const where: any = {};

    if (query.title) {
      where.title = ILike(`%${query.title}%`);
    }
    if (query.search) {
      where.title = ILike(`%${query.search}%`);
    }

    const [data, totalCount] = await this.repository.findAndCount({
      where,
      skip: query.offset,
      take: query.limit,
      order: { createdAt: 'DESC' },
      relations: ['attendees', 'event'],
    });

    return { data, totalCount };
  }

  async findOne(id: string): Promise<Engagement | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['attendees', 'attendees.user', 'attendees.expert', 'event'],
    });
  }

  async create(dto: CreateEngagementDto): Promise<Engagement> {
    const engagement = this.repository.create(dto);
    return this.repository.save(engagement);
  }

  async update(
    id: string,
    dto: UpdateEngagementDto,
  ): Promise<Engagement | null> {
    await this.repository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
