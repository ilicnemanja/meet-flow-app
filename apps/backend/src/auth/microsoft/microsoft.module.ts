import { Module } from '@nestjs/common';
import { MicrosoftService } from './microsoft.service';
import { MicrosoftController } from './microsoft.controller';

@Module({
  providers: [MicrosoftService],
  controllers: [MicrosoftController],
})
export class MicrosoftModule {}
