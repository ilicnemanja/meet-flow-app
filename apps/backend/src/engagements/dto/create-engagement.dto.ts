import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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
}
