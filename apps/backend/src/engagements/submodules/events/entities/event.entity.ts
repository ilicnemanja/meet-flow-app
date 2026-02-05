import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from 'src/common/db/base-entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { Engagement } from '../../../entities/engagement.entity';

export enum SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  FAILED = 'failed',
}

@Entity('engagement_events')
export class EngagementEvent extends BaseEntity {
  @ApiProperty({
    description: 'Sync status of the event',
    enum: SyncStatus,
    default: SyncStatus.PENDING,
  })
  @Column({
    name: 'sync_status',
    type: 'enum',
    enum: SyncStatus,
    default: SyncStatus.PENDING,
  })
  syncStatus: SyncStatus;

  @ApiPropertyOptional({
    description: 'External provider event ID (e.g., Microsoft Graph event ID)',
    nullable: true,
  })
  @Column({
    name: 'external_event_id',
    type: 'text',
    nullable: true,
    comment: 'External Provider Event ID',
  })
  externalEventId: string | null;

  @ApiProperty({ description: 'Engagement ID', format: 'uuid' })
  @Column({ name: 'engagement_id', type: 'uuid', unique: true })
  engagementId: string;

  @ApiPropertyOptional({ description: 'Associated engagement', type: () => Engagement })
  @OneToOne(() => Engagement, (engagement) => engagement.event)
  @JoinColumn({ name: 'engagement_id' })
  engagement: Engagement;
}
