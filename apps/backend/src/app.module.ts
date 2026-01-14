import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MicrosoftModule } from './auth/microsoft/microsoft.module';

@Module({
  imports: [MicrosoftModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
