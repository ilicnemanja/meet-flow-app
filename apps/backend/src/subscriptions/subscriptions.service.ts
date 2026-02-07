import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SubscriptionsRepository } from './subscriptions.repository';
import { QuerySubscriptionDto } from './dto/query-subscription.dto';
import { PaginatedResponseDto } from '../common/db/base-query-dto';
import { Subscription } from './entities/subscription.entity';
import { MicrosoftGraphService } from '@microsoft/graph';

const RENEWAL_THRESHOLD_MINUTES = 5;

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

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

  async findBySubscriptionId(
    subscriptionId: string,
  ): Promise<Subscription | null> {
    return this.subscriptionsRepository.findBySubscriptionId(subscriptionId);
  }

  async upsert(
    organizerEmail: string,
    microsoftHomeAccountId: string,
  ): Promise<Subscription> {
    const existingSubscription =
      await this.subscriptionsRepository.findByOrganizerEmail(organizerEmail);

    if (existingSubscription) {
      const minutesUntilExpiry =
        (existingSubscription.expiresAt.getTime() - Date.now()) / (1000 * 60);

      if (minutesUntilExpiry > RENEWAL_THRESHOLD_MINUTES) {
        this.logger.log(
          `Subscription for ${organizerEmail} is still valid (${Math.round(minutesUntilExpiry)} min remaining)`,
        );
        return existingSubscription;
      }

      this.logger.log(
        `Subscription for ${organizerEmail} is near expiry, renewing...`,
      );

      const result = await this.microsoftGraphService.renewSubscription(
        microsoftHomeAccountId,
        existingSubscription.subscriptionId,
      );

      return this.subscriptionsRepository.update(existingSubscription.id, {
        expiresAt: new Date(result.expirationDateTime),
        lastRenewedAt: new Date(),
      });
    }

    const { subscription, clientState } =
      await this.microsoftGraphService.subscribeToChange(
        microsoftHomeAccountId,
      );

    return this.subscriptionsRepository.create({
      organizerEmail,
      subscriptionId: subscription.id,
      clientState,
      microsoftHomeAccountId,
      expiresAt: new Date(subscription.expirationDateTime),
      lastRenewedAt: new Date(),
    });
  }

  async remove(id: string): Promise<void> {
    const subscription = await this.subscriptionsRepository.findOne(id);
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID "${id}" not found`);
    }
    await this.subscriptionsRepository.remove(id);
  }
}
