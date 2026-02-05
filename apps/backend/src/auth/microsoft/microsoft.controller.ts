import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  Body,
  BadRequestException,
  UseGuards,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MicrosoftService } from './microsoft.service';
import { SessionStore } from './session.store';
import { SubscriptionService } from './subscription.service';
import { SubscriptionStore } from './subscription.store';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SendEmailDto } from './dto/send-email.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtPayload } from './jwt.strategy';

@Controller('auth/microsoft')
export class MicrosoftController {
  constructor(
    private readonly microsoftService: MicrosoftService,
    private readonly sessionStore: SessionStore,
    private readonly subscriptionService: SubscriptionService,
    private readonly subscriptionStore: SubscriptionStore,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('login')
  async login(@Res() res: Response) {
    // Create new OAuth session with unique PKCE parameters
    const { state, codeChallenge } = this.sessionStore.createOAuthSession();

    const params = new URLSearchParams({
      client_id: this.configService.get<string>('MICROSOFT_CLIENT_ID')!,
      response_type: 'code',
      redirect_uri: this.configService.get<string>('MICROSOFT_REDIRECT_URI')!,
      state,
      response_mode: 'query',
      prompt: 'consent',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      scope: [
        'openid',
        'profile',
        'email',
        'offline_access',
        'Calendars.ReadWrite',
        'Mail.Read',
        'Mail.ReadWrite',
        'Mail.Send',
        'User.Read',
      ].join(' '),
    });

    const url = `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?${params}`;
    return res.redirect(url);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      throw new BadRequestException('Missing code or state parameter');
    }

    // Verify and consume OAuth session
    const codeVerifier = this.sessionStore.consumeOAuthSession(state);
    if (!codeVerifier) {
      throw new BadRequestException('Invalid or expired OAuth state');
    }

    try {
      // Exchange code for tokens
      const { accessToken, refreshToken, expiresIn } =
        await this.microsoftService.exchangeCodeForTokens(code, codeVerifier);

      // Get user profile
      const userProfile =
        await this.microsoftService.getUserProfile(accessToken);

      // Create session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store user session
      this.sessionStore.createUserSession(
        sessionId,
        userProfile.id,
        accessToken,
        expiresIn,
        refreshToken,
      );

      // Create JWT token
      const jwtPayload: JwtPayload = {
        sessionId,
        userId: userProfile.id,
      };

      const jwtToken = this.jwtService.sign(jwtPayload);

      // Redirect to frontend with JWT token
      const frontendUrl = this.configService.get<string>(
        'FRONTEND_REDIRECT_URI',
      );
      const url = `${frontendUrl}?token=${jwtToken}`;

      res.redirect(url);
    } catch (err: any) {
      console.error('Authentication failed:', err);
      const frontendUrl = this.configService.get<string>(
        'FRONTEND_REDIRECT_URI',
      );
      res.redirect(`${frontendUrl}?error=authentication_failed`);
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    const userProfile = await this.microsoftService.getUserProfile(
      req.user.accessToken,
    );
    return userProfile;
  }

  @Post('send-email')
  @UseGuards(JwtAuthGuard)
  async sendEmail(
    @Request() req: any,
    @Body(new ValidationPipe()) emailData: SendEmailDto,
  ) {
    await this.microsoftService.sendEmail(req.user.accessToken, emailData);
    return {
      success: true,
      message: 'Email sent successfully',
    };
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  async refreshToken(@Request() req: any) {
    const session = this.sessionStore.getUserSession(req.user.sessionId);

    if (!session || !session.refreshToken) {
      throw new BadRequestException('No refresh token available');
    }

    try {
      const { accessToken, expiresIn } =
        await this.microsoftService.refreshAccessToken(session.refreshToken);

      // Update session with new access token
      this.sessionStore.updateAccessToken(
        req.user.sessionId,
        accessToken,
        expiresIn,
      );

      return {
        success: true,
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      // If refresh fails, delete the session
      this.sessionStore.deleteUserSession(req.user.sessionId);
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any) {
    // Delete Graph subscription if exists
    try {
      await this.subscriptionService.deleteSubscriptionByUserId(
        req.user.accessToken,
        req.user.userId,
      );
    } catch (error) {
      // Log error but don't fail logout
      console.error('Failed to delete subscription on logout:', error);
    }

    // Delete user session
    this.sessionStore.deleteUserSession(req.user.sessionId);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Get('calendar/events')
  @UseGuards(JwtAuthGuard)
  async getCalendarEvents(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const events = await this.microsoftService.getCalendarEvents(
      req.user.accessToken,
      startDate,
      endDate,
    );
    return { events };
  }

  @Post('calendar/events')
  @UseGuards(JwtAuthGuard)
  async createCalendarEvent(
    @Request() req: any,
    @Body(new ValidationPipe()) eventData: CreateEventDto,
  ) {
    const event = await this.microsoftService.createCalendarEvent(
      req.user.accessToken,
      eventData,
    );
    return {
      success: true,
      message: 'Event created successfully',
      event,
    };
  }

  @Post('calendar/events/:eventId')
  @UseGuards(JwtAuthGuard)
  async deleteCalendarEvent(
    @Request() req: any,
    @Query('eventId') eventId: string,
  ) {
    await this.microsoftService.deleteCalendarEvent(
      req.user.accessToken,
      eventId,
    );
    return {
      success: true,
      message: 'Event deleted successfully',
    };
  }

  @Get('mail/inbox')
  @UseGuards(JwtAuthGuard)
  async getInboxMessages(
    @Request() req: any,
    @Query('top') top?: string,
    @Query('skip') skip?: string,
  ) {
    const topNum = top ? parseInt(top, 10) : 50;
    const skipNum = skip ? parseInt(skip, 10) : 0;

    const result = await this.microsoftService.getInboxMessages(
      req.user.accessToken,
      topNum,
      skipNum,
    );
    return result;
  }

  @Get('mail/message/:messageId')
  @UseGuards(JwtAuthGuard)
  async getMessage(@Request() req: any, @Query('messageId') messageId: string) {
    const message = await this.microsoftService.getMessage(
      req.user.accessToken,
      messageId,
    );
    return message;
  }

  @Post('mail/message/:messageId/read')
  @UseGuards(JwtAuthGuard)
  async markMessageAsRead(
    @Request() req: any,
    @Query('messageId') messageId: string,
    @Body() body: { isRead: boolean },
  ) {
    await this.microsoftService.markMessageAsRead(
      req.user.accessToken,
      messageId,
      body.isRead,
    );
    return {
      success: true,
      message: 'Message updated successfully',
    };
  }
}
