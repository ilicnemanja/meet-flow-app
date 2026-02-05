import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SessionStore } from './session.store';

export interface JwtPayload {
  sessionId: string;
  userId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private sessionStore: SessionStore,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    const session = this.sessionStore.getUserSession(payload.sessionId);

    if (!session) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    return {
      userId: payload.userId,
      sessionId: payload.sessionId,
      accessToken: session.accessToken,
    };
  }
}
