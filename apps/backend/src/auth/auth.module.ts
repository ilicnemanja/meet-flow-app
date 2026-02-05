import { Module } from '@nestjs/common';
import { MicrosoftAuthModule } from '@microsoft/graph';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController, MicrosoftAuthModule],
  providers: [AuthService],
})
export class AuthModule {}
