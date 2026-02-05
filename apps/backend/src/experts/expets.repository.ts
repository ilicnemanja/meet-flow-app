import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Expert } from './entities/expert.entity';
import { QueryExpertDto } from './dto/query-expert.dto';

@Injectable()
export class ExpertsRepository {
  constructor(
    @InjectRepository(Expert)
    private readonly repository: Repository<Expert>,
  ) {}

  async findAll(
    query: QueryExpertDto,
  ): Promise<{ data: Expert[]; totalCount: number }> {
    const where: any = {};

    if (query.firstName) {
      where.firstName = ILike(`%${query.firstName}%`);
    }
    if (query.lastName) {
      where.lastName = ILike(`%${query.lastName}%`);
    }
    if (query.email) {
      where.email = ILike(`%${query.email}%`);
    }
    if (query.search) {
      where.fullName = ILike(`%${query.search}%`);
    }

    const [data, totalCount] = await this.repository.findAndCount({
      where,
      skip: query.offset,
      take: query.limit,
      order: { createdAt: 'DESC' },
    });

    return { data, totalCount };
  }

  async findOne(id: string): Promise<Expert | null> {
    return this.repository.findOne({ where: { id } });
  }
}
