import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsRepository } from './subscriptions.repository';
import { MicrosoftGraphModule } from '@microsoft/graph';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription]), MicrosoftGraphModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsRepository],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
