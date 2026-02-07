import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConfidentialClientApplication,
  AuthenticationResult,
} from '@azure/msal-node';
import { randomBytes, randomUUID, createHash } from 'crypto';
import axios from 'axios';
import { MicrosoftUserProfile } from './interfaces/microsoft-user-profile.interface';

@Injectable()
export class MicrosoftAuthService {
  private readonly msalClient: ConfidentialClientApplication;
  private readonly redirectUri: string;
  private readonly scopes: string[];
  private readonly codeVerifiers = new Map<string, string>();

  constructor(private readonly configService: ConfigService) {
    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: this.configService.get<string>('microsoft.clientId'),
        authority: this.configService.get<string>('microsoft.authority'),
        clientSecret: this.configService.get<string>('microsoft.clientSecret'),
      },
    });
    this.redirectUri = this.configService.get<string>('microsoft.redirectUri');
    this.scopes = this.configService.get<string[]>('microsoft.scopes');
  }

  async authorize(): Promise<string> {
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const state = randomUUID();

    this.codeVerifiers.set(state, verifier);

    return this.msalClient.getAuthCodeUrl({
      scopes: this.scopes,
      redirectUri: this.redirectUri,
      prompt: 'select_account',
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
      state,
      responseMode: 'query',
    });
  }

  async getAccessToken(
    code: string,
    state: string,
  ): Promise<AuthenticationResult> {
    const codeVerifier = this.codeVerifiers.get(state);
    this.codeVerifiers.delete(state);

    return this.msalClient.acquireTokenByCode({
      code,
      scopes: this.scopes,
      redirectUri: this.redirectUri,
      codeVerifier,
    });
  }

  async getUserProfile(accessToken: string): Promise<MicrosoftUserProfile> {
    const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return {
      email: response.data.mail || response.data.userPrincipalName,
      firstName: response.data.givenName || '',
      lastName: response.data.surname || '',
      microsoftId: response.data.id,
    };
  }

  async refreshToken(
    accountHomeId: string,
  ): Promise<AuthenticationResult | null> {
    const cache = this.msalClient.getTokenCache();
    const accounts = await cache.getAllAccounts();
    const account = accounts.find((a) => a.homeAccountId === accountHomeId);

    if (!account) {
      return null;
    }

    return this.msalClient.acquireTokenSilent({
      account,
      scopes: this.scopes,
    });
  }
}
