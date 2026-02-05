import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BaseQueryDto } from '../../common/db/base-query-dto';

export class QueryExpertDto extends BaseQueryDto {
  @ApiPropertyOptional({ description: 'Filter by first name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Filter by last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Filter by email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Search across first name, last name, and email',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
