import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get('microsoft/login')
  @ApiOperation({ summary: 'Initiate Microsoft OAuth login' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Microsoft login page',
  })
  async microsoftLogin(@Res() res: Response): Promise<void> {
    const authUrl = await this.authService.getMicrosoftAuthUrl();
    res.redirect(authUrl);
  }

  @Public()
  @Get('microsoft/callback')
  @ApiOperation({ summary: 'Microsoft OAuth callback handler' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with JWT token',
  })
  async microsoftCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('frontend.url');

    if (error) {
      res.redirect(
        `${frontendUrl}/auth-error?error=${encodeURIComponent(errorDescription || error)}`,
      );
      return;
    }

    try {
      const { token } = await this.authService.handleMicrosoftCallback(
        code,
        state,
      );
      const frontendRedirect = this.configService.get<string>(
        'frontend.redirectUri',
      );
      res.redirect(`${frontendRedirect}?token=${token}`);
    } catch (err) {
      res.redirect(
        `${frontendUrl}/auth-error?error=${encodeURIComponent(err.message)}`,
      );
    }
  }
}
