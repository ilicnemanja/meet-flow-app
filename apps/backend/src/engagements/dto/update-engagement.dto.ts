import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateEngagementDto } from './create-engagement.dto';
import { EngagementStatus } from '../entities/engagement.entity';

export class UpdateEngagementDto extends PartialType(CreateEngagementDto) {
  @ApiPropertyOptional({
    description: 'Engagement status',
    enum: EngagementStatus,
  })
  @IsOptional()
  @IsEnum(EngagementStatus)
  status?: EngagementStatus;
}
