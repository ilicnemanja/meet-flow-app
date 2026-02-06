import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BaseQueryDto } from '../../common/db/base-query-dto';

export class QuerySubscriptionDto extends BaseQueryDto {
  @ApiPropertyOptional({ description: 'Filter by organizer email' })
  @IsOptional()
  @IsString()
  organizerEmail?: string;

  @ApiPropertyOptional({ description: 'Search across fields' })
  @IsOptional()
  @IsString()
  search?: string;
}
