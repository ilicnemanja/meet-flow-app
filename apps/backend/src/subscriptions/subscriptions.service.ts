import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionsRepository } from './subscriptions.repository';
import { QuerySubscriptionDto } from './dto/query-subscription.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { PaginatedResponseDto } from '../common/db/base-query-dto';
import { Subscription } from './entities/subscription.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
  ) {}

  async findAll(
    query: QuerySubscriptionDto,
  ): Promise<PaginatedResponseDto<Subscription>> {
    const { data, totalCount } =
      await this.subscriptionsRepository.findAll(query);
    return new PaginatedResponseDto(data, totalCount, query);
  }

  async findOne(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionsRepository.findOne(id);
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID "${id}" not found`);
    }
    return subscription;
  }

  async create(dto: CreateSubscriptionDto): Promise<Subscription> {
    return this.subscriptionsRepository.create(dto);
  }

  async update(id: string, dto: UpdateSubscriptionDto): Promise<Subscription> {
    const subscription = await this.subscriptionsRepository.update(id, dto);
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID "${id}" not found`);
    }
    return subscription;
  }

  async remove(id: string): Promise<void> {
    const subscription = await this.subscriptionsRepository.findOne(id);
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID "${id}" not found`);
    }
    await this.subscriptionsRepository.remove(id);
  }
}
