import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BaseQueryDto } from '../../../../common/db/base-query-dto';
import { SyncStatus } from '../entities/event.entity';

export class QueryEventDto extends BaseQueryDto {
  @IsOptional()
  @IsEnum(SyncStatus)
  syncStatus?: SyncStatus;

  @IsOptional()
  @IsString()
  externalEventId?: string;
}
