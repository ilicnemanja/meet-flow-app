import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SyncStatus } from '../entities/event.entity';

export class CreateEventDto {
  @ApiPropertyOptional({
    description: 'Sync status of the event',
    enum: SyncStatus,
    default: SyncStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(SyncStatus)
  syncStatus?: SyncStatus;

  @ApiPropertyOptional({
    description: 'External provider event ID (e.g., Microsoft Graph event ID)',
  })
  @IsOptional()
  @IsString()
  externalEventId?: string;
}
