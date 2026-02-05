import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ResponseStatus } from '../entities/attendee.entity';

export class CreateAttendeeDto {
  @ApiPropertyOptional({ description: 'User ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Expert ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  expertId?: string;

  @ApiPropertyOptional({
    description: 'Whether the attendee is an expert',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isExpert?: boolean;

  @ApiPropertyOptional({
    description: 'Response status of the attendee',
    enum: ResponseStatus,
    default: ResponseStatus.NO_RESPONSE,
  })
  @IsOptional()
  @IsEnum(ResponseStatus)
  responseStatus?: ResponseStatus;
}
