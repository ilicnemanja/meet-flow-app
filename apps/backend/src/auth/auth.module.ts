import { Module } from '@nestjs/common';
import { MicrosoftAuthModule } from '@microsoft/graph';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [MicrosoftAuthModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
