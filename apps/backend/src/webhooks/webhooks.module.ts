import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MicrosoftAuthModule, MicrosoftGraphModule } from '@microsoft/graph';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EngagementEvent } from '../engagements/submodules/events/entities/event.entity';
import { Engagement } from '../engagements/entities/engagement.entity';
import { EngagementAttendee } from '../engagements/submodules/attendees/entities/attendee.entity';
import { EventsRepository } from '../engagements/submodules/events/events.repository';
import { EngagementsRepository } from '../engagements/engagements.repository';
import { AttendeesRepository } from '../engagements/submodules/attendees/attendees.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([EngagementEvent, Engagement, EngagementAttendee]),
    SubscriptionsModule,
    MicrosoftGraphModule,
    MicrosoftAuthModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, EventsRepository, EngagementsRepository, AttendeesRepository],
})
export class WebhooksModule {}
