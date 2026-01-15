import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import * as crypto from 'crypto';
import axios from 'axios';
import { config } from 'dotenv';

config();

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateCodeVerifier(): string {
  return base64UrlEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64UrlEncode(hash);
}

function generateState(): string {
  return base64UrlEncode(crypto.randomBytes(16));
}

@Controller('auth/microsoft')
export class MicrosoftController {
  private readonly codeVerifier: string;
  private readonly codeChallenge: string;
  private readonly state: string;

  constructor() {
    this.codeVerifier = generateCodeVerifier();
    this.codeChallenge = generateCodeChallenge(this.codeVerifier);
    this.state = generateState();
  }

  @Get('login')
  async login(@Res() res: Response) {
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
      state: this.state,
      response_mode: 'query',
      prompt: 'consent',
      code_challenge: this.codeChallenge,
      code_challenge_method: 'S256',
      scope: [
        'openid',
        'profile',
        'email',
        'offline_access',
        'Calendars.ReadWrite',
        'Mail.Send',
        'User.Read',
      ].join(' '),
    });

    const url = `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?${params}`;
    return res.redirect(url);
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state: string) {
    if (!code || !state || state !== this.state) {
      throw new BadRequestException('Invalid OAuth state');
    }

    try {
      const tokenResponse = await axios.post(
        `https://login.microsoftonline.com/consumers/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
          code_verifier: this.codeVerifier,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      const { access_token } = tokenResponse.data;

      // Validate the token by calling /me endpoint
      try {
        const userInfo = await axios.get(
          'https://graph.microsoft.com/v1.0/me',
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          },
        );

        console.log('Token is valid! User info:', userInfo.data);

        // Return both token data and user info
        return {
          ...tokenResponse.data,
          userInfo: userInfo.data,
          tokenValid: true,
        };
      } catch (graphError: any) {
        console.error('Token validation failed:', graphError.response?.data);

        // Token was issued but invalid for Graph API
        return {
          ...tokenResponse.data,
          tokenValid: false,
          validationError: graphError.response?.data,
        };
      }
    } catch (err: any) {
      console.error('Token request failed:', err.response?.data || err);
      throw new BadRequestException(
        err.response?.data || 'Authentication failed',
      );
    }
  }

  @Get('send-test-email')
  async sendTestEmail(@Query('accessToken') accessToken: string) {
    if (!accessToken) {
      throw new BadRequestException('Access token is required');
    }

    try {
      const response = await axios.post(
        'https://graph.microsoft.com/v1.0/me/sendMail',
        {
          message: {
            subject: 'Test email from NestJS 🚀',
            body: {
              contentType: 'Text',
              content: 'If you are reading this, Graph mail sending works.',
            },
            toRecipients: [
              {
                emailAddress: {
                  address: 'ilicnemanja.it@gmail.com',
                },
              },
            ],
          },
          saveToSentItems: true,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: true,
        status: response.status,
      };
    } catch (err: any) {
      console.error('Send mail failed:', err.response?.data || err);

      throw new BadRequestException(
        err.response?.data || 'Failed to send email',
      );
    }
  }
}
