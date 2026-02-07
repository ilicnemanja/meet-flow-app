import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateAttendeeDto } from '../submodules/attendees/dto/create-attendee.dto';

export class CreateEngagementDto {
  @ApiProperty({ description: 'Engagement title', maxLength: 255 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Engagement description' })
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  organizerEmail: string;

  @ApiPropertyOptional({
    description:
      'Event start date and time (ISO 8601). If provided with endDateTime, the engagement will be auto-scheduled in Outlook.',
    example: '2026-03-01T09:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDateTime?: string;

  @ApiPropertyOptional({
    description:
      'Event end date and time (ISO 8601). If provided with startDateTime, the engagement will be auto-scheduled in Outlook.',
    example: '2026-03-01T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  endDateTime?: string;

  @ApiPropertyOptional({
    description: 'Timezone for the event',
    default: 'UTC',
    example: 'Europe/Belgrade',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timeZone?: string;

  @ApiPropertyOptional({
    description: 'List of attendees to add to the engagement',
    type: [CreateAttendeeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttendeeDto)
  attendees?: CreateAttendeeDto[];
}
