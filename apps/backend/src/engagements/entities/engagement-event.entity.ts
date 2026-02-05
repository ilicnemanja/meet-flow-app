import { BaseEntity } from 'src/common/db/base-entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { Engagement } from './engagement.entity';

export enum SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  FAILED = 'failed',
}

@Entity('engagement_events')
export class EngagementEvent extends BaseEntity {
  @Column({
    name: 'sync_status',
    type: 'enum',
    enum: SyncStatus,
    default: SyncStatus.PENDING,
  })
  syncStatus: SyncStatus;

  @Column({
    name: 'external_event_id',
    type: 'text',
    nullable: true,
    comment: 'External Provider Event ID',
  })
  externalEventId: string | null;

  @Column({ name: 'engagement_id', type: 'uuid', unique: true })
  engagementId: string;

  @OneToOne(() => Engagement, (engagement) => engagement.event)
  @JoinColumn({ name: 'engagement_id' })
  engagement: Engagement;
}
