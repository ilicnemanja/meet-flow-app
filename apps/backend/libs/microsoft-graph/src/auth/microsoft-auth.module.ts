import { Module } from '@nestjs/common';
import { MicrosoftAuthService } from './microsoft-auth.service';

@Module({
  providers: [MicrosoftAuthService],
  exports: [MicrosoftAuthService],
})
export class MicrosoftAuthModule {}
