import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MicrosoftAuthService, MicrosoftUserProfile } from '@microsoft/graph';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly microsoftAuthService: MicrosoftAuthService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async getMicrosoftAuthUrl(): Promise<string> {
    return this.microsoftAuthService.authorize();
  }

  async handleMicrosoftCallback(
    code: string,
    state: string,
  ): Promise<{ token: string; user: User }> {
    const tokenResponse = await this.microsoftAuthService.getAccessToken(
      code,
      state,
    );

    if (!tokenResponse?.accessToken) {
      throw new UnauthorizedException('Failed to acquire access token');
    }

    const profile = await this.microsoftAuthService.getUserProfile(
      tokenResponse.accessToken,
    );

    let user = await this.usersService.findByEmail(profile.email);

    if (!user) {
      user = await this.usersService.create({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
      });
    }

    if (!user.microsoftId) {
      await this.usersService.update(user.id, {
        microsoftId: profile.microsoftId,
      });
      user.microsoftId = profile.microsoftId;
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      microsoftHomeAccountId: tokenResponse.account?.homeAccountId,
    };

    const token = this.jwtService.sign(payload);

    return { token, user };
  }

  async getMicrosoftProfile(
    microsoftHomeAccountId: string,
  ): Promise<MicrosoftUserProfile> {
    const tokenResult = await this.microsoftAuthService.refreshToken(
      microsoftHomeAccountId,
    );

    if (!tokenResult) {
      throw new UnauthorizedException(
        'Microsoft session expired. Please log in again.',
      );
    }

    return this.microsoftAuthService.getUserProfile(tokenResult.accessToken);
  }
}
