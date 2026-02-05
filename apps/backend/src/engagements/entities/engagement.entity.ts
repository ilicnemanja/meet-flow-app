import { BaseEntity } from 'src/common/db/base-entity';
import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { EngagementAttendee } from './engagement-attendee.entity';
import { EngagementEvent } from './engagement-event.entity';

@Entity('engagements')
export class Engagement extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @OneToMany(() => EngagementAttendee, (attendee) => attendee.engagement)
  attendees: EngagementAttendee[];

  @OneToOne(() => EngagementEvent, (event) => event.engagement)
  event: EngagementEvent;
}
