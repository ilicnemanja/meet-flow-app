import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MicrosoftService } from './microsoft.service';
import { MicrosoftController } from './microsoft.controller';
import { WebhookController } from './webhook.controller';
import { SessionStore } from './session.store';
import { SubscriptionStore } from './subscription.store';
import { SubscriptionService } from './subscription.service';
import { CalendarGateway } from './calendar.gateway';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
        signOptions: {
          expiresIn: '7d', // JWT expires in 7 days
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    MicrosoftService,
    SessionStore,
    SubscriptionStore,
    SubscriptionService,
    CalendarGateway,
    JwtStrategy,
  ],
  controllers: [MicrosoftController, WebhookController],
  exports: [CalendarGateway],
})
export class MicrosoftModule {}
