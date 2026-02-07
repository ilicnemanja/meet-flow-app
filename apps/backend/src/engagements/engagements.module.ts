import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MicrosoftAuthModule, MicrosoftGraphModule } from '@microsoft/graph';
import { EngagementsService } from './engagements.service';
import { EngagementsController } from './engagements.controller';
import { EngagementsRepository } from './engagements.repository';
import { Engagement } from './entities/engagement.entity';
import { EngagementAttendee } from './submodules/attendees/entities/attendee.entity';
import { EngagementEvent } from './submodules/events/entities/event.entity';
import { AttendeesController } from './submodules/attendees/attendees.controller';
import { AttendeesService } from './submodules/attendees/attendees.service';
import { AttendeesRepository } from './submodules/attendees/attendees.repository';
import { EventsController } from './submodules/events/events.controller';
import { EventsService } from './submodules/events/events.service';
import { EventsRepository } from './submodules/events/events.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Engagement, EngagementAttendee, EngagementEvent]),
    MicrosoftGraphModule,
    MicrosoftAuthModule,
  ],
  controllers: [EngagementsController, AttendeesController, EventsController],
  providers: [
    EngagementsService,
    EngagementsRepository,
    AttendeesService,
    AttendeesRepository,
    EventsService,
    EventsRepository,
  ],
  exports: [EngagementsService, AttendeesService, EventsService],
})
export class EngagementsModule {}
