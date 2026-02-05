import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MicrosoftModule } from './auth/microsoft/microsoft.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MicrosoftModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
