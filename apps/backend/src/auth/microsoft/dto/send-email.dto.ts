import { IsString, IsEmail, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class EmailRecipient {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class SendEmailDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailRecipient)
  @IsNotEmpty()
  to: EmailRecipient[];

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsString()
  contentType?: 'Text' | 'HTML';
}
