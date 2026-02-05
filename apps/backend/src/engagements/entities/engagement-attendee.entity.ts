import { BaseEntity } from 'src/common/db/base-entity';
import { Expert } from 'src/experts/entities/expert.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { Engagement } from './engagement.entity';

export enum ResponseStatus {
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative',
  NO_RESPONSE = 'none',
}

@Entity('engagement_attendees')
export class EngagementAttendee extends BaseEntity {
  @Column({ name: 'engagement_id', type: 'uuid' })
  engagementId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'expert_id', type: 'uuid', nullable: true })
  expertId: string | null;

  @Column({ name: 'is_expert', type: 'boolean', default: false })
  isExpert: boolean;

  @Column({
    name: 'response_status',
    type: 'enum',
    enum: ResponseStatus,
    default: ResponseStatus.NO_RESPONSE,
  })
  responseStatus: ResponseStatus;

  @ManyToOne(() => Engagement, (engagement) => engagement.attendees)
  @JoinColumn({ name: 'engagement_id' })
  engagement: Engagement;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  users: User | null;

  @ManyToOne(() => Expert, { nullable: true })
  @JoinColumn({ name: 'expert_id' })
  experts: Expert | null;
}
