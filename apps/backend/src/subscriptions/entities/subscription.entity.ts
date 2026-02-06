import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from 'src/common/db/base-entity';
import { Engagement } from 'src/engagements/entities/engagement.entity';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity('subscriptions')
export class Subscription extends BaseEntity {
  @ApiProperty({ description: 'Engagement Organizer Email' })
  @Column({
    name: 'organizer_email',
    type: 'varchar',
    length: 255,
    unique: true,
  })
  organizerEmail: string;

  @ApiProperty({ description: 'Provider Subscription ID' })
  @Column({ name: 'subscription_id', type: 'varchar', length: 255 })
  subscriptionId: string;

  @ApiProperty({ description: 'Expiration of subscription' })
  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt: Date;

  @ApiPropertyOptional({ description: 'Last Time Subscription Renewed' })
  @Column({
    name: 'last_renewed_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  lastRenewedAt: Date;

  @ApiPropertyOptional({
    description: 'List of engagements associated with this subscription',
    type: () => [Engagement],
  })
  @OneToMany(() => Engagement, (engagement) => engagement.subscription)
  engagements?: Engagement[];
}
