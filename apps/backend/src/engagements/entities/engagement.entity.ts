import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from 'src/common/db/base-entity';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { EngagementAttendee } from '../submodules/attendees/entities/attendee.entity';
import { EngagementEvent } from '../submodules/events/entities/event.entity';

@Entity('engagements')
export class Engagement extends BaseEntity {
  @ApiProperty({ description: 'Engagement title' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ description: 'Engagement description' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ description: 'Engagement organizer email' })
  @Column({ name: 'organizer_email', type: 'varchar', length: 255 })
  organizerEmail: string;

  @ApiProperty({ description: 'Event start date and time' })
  @Column({ name: 'start_date_time', type: 'timestamptz' })
  startDateTime: Date;

  @ApiProperty({ description: 'Event end date and time' })
  @Column({ name: 'end_date_time', type: 'timestamptz' })
  endDateTime: Date;

  @ApiProperty({ description: 'Timezone for the event', default: 'UTC' })
  @Column({ name: 'time_zone', type: 'varchar', length: 100, default: 'UTC' })
  timeZone: string;

  @ManyToOne(() => Subscription, (subscription) => subscription.engagements)
  @JoinColumn({
    name: 'organizer_email',
    referencedColumnName: 'organizerEmail',
  })
  subscription: Subscription;

  @ApiPropertyOptional({
    description: 'List of attendees',
    type: () => [EngagementAttendee],
  })
  @OneToMany(() => EngagementAttendee, (attendee) => attendee.engagement)
  attendees: EngagementAttendee[];

  @ApiPropertyOptional({
    description: 'Associated event',
    type: () => EngagementEvent,
  })
  @OneToOne(() => EngagementEvent, (event) => event.engagement)
  event: EngagementEvent;
}
