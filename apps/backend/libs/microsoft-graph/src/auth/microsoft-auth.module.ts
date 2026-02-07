import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MicrosoftAuthService } from './microsoft-auth.service';

@Module({
  imports: [ConfigModule],
  providers: [MicrosoftAuthService],
  exports: [MicrosoftAuthService],
})
export class MicrosoftAuthModule {}
