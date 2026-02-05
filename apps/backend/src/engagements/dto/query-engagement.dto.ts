import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BaseQueryDto } from '../../common/db/base-query-dto';

export class QueryEngagementDto extends BaseQueryDto {
  @ApiPropertyOptional({ description: 'Filter by title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Search across title and description' })
  @IsOptional()
  @IsString()
  search?: string;
}
