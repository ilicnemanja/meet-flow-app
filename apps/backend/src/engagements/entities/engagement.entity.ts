import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from 'src/common/db/base-entity';
import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
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
