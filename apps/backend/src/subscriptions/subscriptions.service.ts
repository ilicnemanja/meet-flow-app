import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionsRepository } from './subscriptions.repository';
import { QuerySubscriptionDto } from './dto/query-subscription.dto';
import { UpsertSubscriptionDto } from './dto/upsert-subscription.dto';
import { PaginatedResponseDto } from '../common/db/base-query-dto';
import { Subscription } from './entities/subscription.entity';
import { MicrosoftGraphService } from '@microsoft/graph';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly microsoftGraphService: MicrosoftGraphService,
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

  async upsert(
    dto: UpsertSubscriptionDto,
    microsoftHomeAccountId: string,
  ): Promise<Subscription> {
    const existingSubscription =
      await this.subscriptionsRepository.findByOrganizerEmail(
        dto.organizerEmail,
      );

    if (existingSubscription) {
      // 1. Check if subscription is not expired and expiration is not less then 5min
      // if not then return existing subscription
      // 2. if subscription is already expired the call microsoftGraphService.renewSubcription
      // Pseudo code
      // if (existingSubscription.expiresAt not less then 5min) {
      //   return existingSubscription;
      // }
      // const result = await this.microsoftGraphService.renewSubcription(
      //   microsoftHomeAccountId,
      //   dto.organizerEmail,
      // );
      // const data: UpsertSubscriptionDto = {
      //   organizerEmail: dto.organizerEmail,
      //   subscriptionId: result.id,
      //   expiresAt: new Date(result.expirationDateTime), // check if its okay to be string instead ?
      //   lastRenewedAt: new Date(),
      // };
      // return this.subscriptionsRepository.update(data);
    }

    const result = await this.microsoftGraphService.subscribeToChange(
      microsoftHomeAccountId,
      dto.organizerEmail,
    );

    const data: UpsertSubscriptionDto = {
      organizerEmail: dto.organizerEmail,
      subscriptionId: result.id,
      expiresAt: new Date(result.expirationDateTime), // check if its okay to be string instead ?
      lastRenewedAt: new Date(),
    };

    return this.subscriptionsRepository.create(data);
  }

  async remove(id: string): Promise<void> {
    const subscription = await this.subscriptionsRepository.findOne(id);
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID "${id}" not found`);
    }
    await this.subscriptionsRepository.remove(id);
  }
}
