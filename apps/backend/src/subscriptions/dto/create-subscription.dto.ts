import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Organizer email address', maxLength: 255 })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  organizerEmail: string;

  @ApiProperty({
    description: 'Provider Subscription ID',
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  subscriptionId: string;

  @ApiProperty({ description: 'Expiration of subscription' })
  @IsNotEmpty()
  @IsDateString()
  expiresAt: Date;

  @ApiPropertyOptional({ description: 'Last Time Subscription Renewed' })
  @IsOptional()
  @IsDateString()
  lastRenewedAt?: Date;
}
