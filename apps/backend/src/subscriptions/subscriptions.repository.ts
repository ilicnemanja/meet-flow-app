import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { QuerySubscriptionDto } from './dto/query-subscription.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsRepository {
  constructor(
    @InjectRepository(Subscription)
    private readonly repository: Repository<Subscription>,
  ) {}

  async findAll(
    query: QuerySubscriptionDto,
  ): Promise<{ data: Subscription[]; totalCount: number }> {
    const where: any = {};

    if (query.organizerEmail) {
      where.organizerEmail = ILike(`%${query.organizerEmail}%`);
    }
    if (query.search) {
      where.organizerEmail = ILike(`%${query.search}%`);
    }

    const [data, totalCount] = await this.repository.findAndCount({
      where,
      skip: query.offset,
      take: query.limit,
      order: { createdAt: 'DESC' },
    });

    return { data, totalCount };
  }

  async findOne(id: string): Promise<Subscription | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['engagements'],
    });
  }

  async findByOrganizerEmail(
    organizerEmail: string,
  ): Promise<Subscription | null> {
    return this.repository.findOne({
      where: { organizerEmail },
    });
  }

  async create(dto: CreateSubscriptionDto): Promise<Subscription> {
    const subscription = this.repository.create(dto);
    return this.repository.save(subscription);
  }

  async update(
    id: string,
    dto: UpdateSubscriptionDto,
  ): Promise<Subscription | null> {
    await this.repository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
