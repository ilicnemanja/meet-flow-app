import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from 'src/common/db/base-entity';
import { Expert } from 'src/experts/entities/expert.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { Engagement } from '../../../entities/engagement.entity';

export enum ResponseStatus {
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative',
  NO_RESPONSE = 'none',
}

@Entity('engagement_attendees')
export class EngagementAttendee extends BaseEntity {
  @ApiProperty({ description: 'Engagement ID', format: 'uuid' })
  @Column({ name: 'engagement_id', type: 'uuid' })
  engagementId: string;

  @ApiPropertyOptional({
    description: 'User ID',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ApiPropertyOptional({
    description: 'Expert ID',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'expert_id', type: 'uuid', nullable: true })
  expertId: string | null;

  @ApiProperty({
    description: 'Whether the attendee is an expert',
    default: false,
  })
  @Column({ name: 'is_expert', type: 'boolean', default: false })
  isExpert: boolean;

  @ApiProperty({
    description: 'Response status of the attendee',
    enum: ResponseStatus,
    default: ResponseStatus.NO_RESPONSE,
  })
  @Column({
    name: 'response_status',
    type: 'enum',
    enum: ResponseStatus,
    default: ResponseStatus.NO_RESPONSE,
  })
  responseStatus: ResponseStatus;

  @ApiPropertyOptional({
    description: 'Associated engagement',
    type: () => Engagement,
  })
  @ManyToOne(() => Engagement, (engagement) => engagement.attendees)
  @JoinColumn({ name: 'engagement_id' })
  engagement: Engagement;

  @ApiPropertyOptional({
    description: 'Associated user',
    type: () => User,
    nullable: true,
  })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @ApiPropertyOptional({
    description: 'Associated expert',
    type: () => Expert,
    nullable: true,
  })
  @ManyToOne(() => Expert, { nullable: true })
  @JoinColumn({ name: 'expert_id' })
  expert: Expert | null;
}
