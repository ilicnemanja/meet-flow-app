import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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

  @ApiProperty({ description: 'Engagement organizer email', maxLength: 255 })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  organizerEmail: string;

  @ApiProperty({
    description: 'Event start date and time (ISO 8601)',
    example: '2026-03-01T09:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  startDateTime: string;

  @ApiProperty({
    description: 'Event end date and time (ISO 8601)',
    example: '2026-03-01T10:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  endDateTime: string;

  @ApiPropertyOptional({
    description: 'Timezone for the event',
    default: 'UTC',
    example: 'Europe/Belgrade',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timeZone?: string;
}
