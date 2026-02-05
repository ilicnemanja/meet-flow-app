import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsISO8601,
  IsArray,
  ValidateNested,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

class EventAttendee {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsISO8601()
  @IsNotEmpty()
  startDateTime: string; // ISO 8601 format

  @IsISO8601()
  @IsNotEmpty()
  endDateTime: string; // ISO 8601 format

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventAttendee)
  attendees?: EventAttendee[];

  @IsOptional()
  @IsString()
  timeZone?: string; // Default to UTC if not provided
}
