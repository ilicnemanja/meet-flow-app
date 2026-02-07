import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from 'src/common/db/base-entity';
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
import { User } from 'src/users/entities/user.entity';

export enum EngagementStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
}

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

  @ApiProperty({
    description: 'Engagement status',
    enum: EngagementStatus,
    default: EngagementStatus.PENDING,
  })
  @Column({
    type: 'enum',
    enum: EngagementStatus,
    default: EngagementStatus.PENDING,
  })
  status: EngagementStatus;

  @ApiPropertyOptional({
    description: 'Event start date and time',
    nullable: true,
  })
  @Column({ name: 'start_date_time', type: 'timestamptz', nullable: true })
  startDateTime: Date | null;

  @ApiPropertyOptional({
    description: 'Event end date and time',
    nullable: true,
  })
  @Column({ name: 'end_date_time', type: 'timestamptz', nullable: true })
  endDateTime: Date | null;

  @ApiProperty({ description: 'Timezone for the event', default: 'UTC' })
  @Column({ name: 'time_zone', type: 'varchar', length: 100, default: 'UTC' })
  timeZone: string;

  @ManyToOne(() => User)
  @JoinColumn({
    name: 'organizer_email',
    referencedColumnName: 'email',
  })
  organizer: User;

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
