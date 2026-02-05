import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { BaseQueryDto } from '../../../../common/db/base-query-dto';
import { ResponseStatus } from '../entities/attendee.entity';

export class QueryAttendeeDto extends BaseQueryDto {
  @ApiPropertyOptional({ description: 'Filter by user ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by expert ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  expertId?: string;

  @ApiPropertyOptional({
    description: 'Filter by response status',
    enum: ResponseStatus,
  })
  @IsOptional()
  @IsEnum(ResponseStatus)
  responseStatus?: ResponseStatus;
}
