# Complete Guide: Real-Time Calendar Sync with Microsoft Graph Webhooks

This guide explains how to implement real-time calendar synchronization using Microsoft Graph Change Notifications (webhooks) and WebSockets. When events are created, updated, or deleted in Microsoft 365 (Outlook, Teams, mobile), your application automatically receives and displays these changes without manual refresh.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Azure Portal Configuration](#azure-portal-configuration)
4. [Backend Implementation (NestJS)](#backend-implementation-nestjs)
5. [Frontend Implementation (React)](#frontend-implementation-react)
6. [Environment Configuration](#environment-configuration)
7. [Local Development with ngrok](#local-development-with-ngrok)
8. [Testing the Implementation](#testing-the-implementation)
9. [Troubleshooting](#troubleshooting)
10. [Production Considerations](#production-considerations)

---

## Architecture Overview

```
┌─────────────────────┐
│  Microsoft Graph    │
│        API          │
└─────────┬───────────┘
          │ (1) Webhook notification (HTTPS POST)
          ▼
┌─────────────────────────────────────────────────────┐
│              NestJS Backend                          │
│  ┌─────────────────┐  ┌─────────────────────────┐   │
│  │ Webhook         │  │ Subscription Service    │   │
│  │ Controller      │  │ (create/renew/delete)   │   │
│  └────────┬────────┘  └─────────────────────────┘   │
│           │                                          │
│           ▼                                          │
│  ┌─────────────────┐  ┌─────────────────────────┐   │
│  │ Calendar        │  │ Subscription Store      │   │
│  │ Gateway (WS)    │  │ (in-memory tracking)    │   │
│  └────────┬────────┘  └─────────────────────────┘   │
└───────────┼─────────────────────────────────────────┘
            │ (2) WebSocket broadcast
            ▼
┌─────────────────────┐
│   React Frontend    │
│  (Calendar updates  │
│   in real-time)     │
└─────────────────────┘
```

### Flow Explanation

1. **User loads Calendar page** → Frontend connects to WebSocket server
2. **WebSocket connected** → Frontend sends `subscribe_calendar` message
3. **Backend receives subscribe** → Creates Microsoft Graph subscription via API
4. **Microsoft validates webhook** → Sends validation token, backend returns it
5. **Subscription active** → Microsoft will now POST to webhook URL on changes
6. **User creates event in Outlook** → Microsoft sends webhook notification
7. **Backend receives notification** → Fetches event details, broadcasts via WebSocket
8. **Frontend receives update** → Updates calendar UI in real-time

---

## Prerequisites

### Required Dependencies

**Backend (NestJS):**
```bash
npm install --save @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install --save-dev @types/socket.io
```

**Frontend (React):**
```bash
npm install --save socket.io-client
```

### Required Microsoft Graph Permissions

Your Azure app registration needs these API permissions:
- `Calendars.ReadWrite` - Required for creating webhook subscriptions on calendar
- `User.Read` - For user profile
- `offline_access` - For refresh tokens

---

## Azure Portal Configuration

### Step 1: Register Application (if not done)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Configure:
   - Name: Your app name
   - Supported account types: Choose based on your needs
   - Redirect URI: `http://localhost:3000/auth/microsoft/callback`

### Step 2: Configure API Permissions

1. Go to your app → **API Permissions**
2. Click **Add a permission** → **Microsoft Graph** → **Delegated permissions**
3. Add:
   - `Calendars.ReadWrite`
   - `User.Read`
   - `offline_access`
4. Click **Grant admin consent** (if required by your organization)

### Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Set description and expiration
4. **Copy the value immediately** (won't be shown again)

### Step 4: Note Application Details

Save these values for your `.env` file:
- **Application (client) ID**: From Overview page
- **Client Secret**: From step 3
- **Tenant ID**: From Overview page (if using single tenant)

---

## Backend Implementation (NestJS)

### File Structure

```
apps/backend/src/auth/microsoft/
├── dto/
│   └── subscription.dto.ts      # DTOs for webhook payloads
├── calendar.gateway.ts          # WebSocket gateway
├── microsoft.controller.ts      # OAuth & API endpoints
├── microsoft.module.ts          # Module configuration
├── microsoft.service.ts         # Microsoft Graph API calls
├── session.store.ts             # User session storage
├── subscription.service.ts      # Graph subscription management
├── subscription.store.ts        # Subscription tracking
└── webhook.controller.ts        # Webhook endpoint
```

### Step 1: Create Subscription Store

This tracks active Microsoft Graph subscriptions in memory.

```typescript
// subscription.store.ts
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

interface GraphSubscription {
  subscriptionId: string;
  userId: string;
  resourcePath: string;
  expirationDateTime: Date;
  clientState: string;
  renewalTimeoutId?: NodeJS.Timeout;
}

@Injectable()
export class SubscriptionStore {
  private subscriptions = new Map<string, GraphSubscription>();
  private userToSubscription = new Map<string, string>();

  constructor() {
    // Clean up expired subscriptions every 10 minutes
    setInterval(() => this.cleanupExpiredSubscriptions(), 10 * 60 * 1000);
  }

  createSubscription(
    subscriptionId: string,
    userId: string,
    resourcePath: string,
    expirationDateTime: Date,
    clientState?: string,
  ): string {
    const state = clientState || crypto.randomBytes(16).toString('hex');

    // Delete old subscription for this user if exists
    const existingId = this.userToSubscription.get(userId);
    if (existingId) {
      this.deleteSubscription(existingId);
    }

    this.subscriptions.set(subscriptionId, {
      subscriptionId,
      userId,
      resourcePath,
      expirationDateTime,
      clientState: state,
    });

    this.userToSubscription.set(userId, subscriptionId);
    return state;
  }

  getSubscription(subscriptionId: string): GraphSubscription | null {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub || new Date() >= sub.expirationDateTime) {
      if (sub) this.deleteSubscription(subscriptionId);
      return null;
    }
    return sub;
  }

  getSubscriptionByUserId(userId: string): GraphSubscription | null {
    const id = this.userToSubscription.get(userId);
    return id ? this.getSubscription(id) : null;
  }

  updateExpiration(subscriptionId: string, expirationDateTime: Date): void {
    const sub = this.subscriptions.get(subscriptionId);
    if (sub) {
      sub.expirationDateTime = expirationDateTime;
      if (sub.renewalTimeoutId) clearTimeout(sub.renewalTimeoutId);
    }
  }

  setRenewalTimeout(subscriptionId: string, timeoutId: NodeJS.Timeout): void {
    const sub = this.subscriptions.get(subscriptionId);
    if (sub) {
      if (sub.renewalTimeoutId) clearTimeout(sub.renewalTimeoutId);
      sub.renewalTimeoutId = timeoutId;
    }
  }

  deleteSubscription(subscriptionId: string): void {
    const sub = this.subscriptions.get(subscriptionId);
    if (sub) {
      if (sub.renewalTimeoutId) clearTimeout(sub.renewalTimeoutId);
      this.userToSubscription.delete(sub.userId);
      this.subscriptions.delete(subscriptionId);
    }
  }

  private cleanupExpiredSubscriptions(): void {
    const now = new Date();
    for (const [id, sub] of this.subscriptions.entries()) {
      if (now >= sub.expirationDateTime) {
        this.deleteSubscription(id);
      }
    }
  }
}
```

### Step 2: Create Subscription DTOs

```typescript
// dto/subscription.dto.ts
export class NotificationItemDto {
  changeType: 'created' | 'updated' | 'deleted';
  clientState: string;
  resource: string;
  resourceData: {
    '@odata.type': string;
    '@odata.id': string;
    '@odata.etag': string;
    id: string;
  };
  subscriptionExpirationDateTime: string;
  subscriptionId: string;
  tenantId: string;
}

export class WebhookNotificationDto {
  value: NotificationItemDto[];
}
```

### Step 3: Create Subscription Service

This handles creating, renewing, and deleting Microsoft Graph subscriptions.

```typescript
// subscription.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStore } from './subscription.store';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly graphApiUrl = 'https://graph.microsoft.com/v1.0';

  constructor(
    private readonly subscriptionStore: SubscriptionStore,
    private readonly configService: ConfigService,
  ) {}

  async createSubscription(accessToken: string, userId: string) {
    const webhookBaseUrl = this.configService.get<string>('WEBHOOK_BASE_URL');

    // Generate client state for validation
    const clientState = this.subscriptionStore.createSubscription(
      '', userId, '/me/calendar/events', new Date(),
    );

    // Max expiration: 4230 minutes (70.5 hours) for calendar events
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + 4230);

    const response = await fetch(`${this.graphApiUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        changeType: 'created,updated,deleted',
        notificationUrl: `${webhookBaseUrl}/auth/microsoft/webhook/notifications`,
        resource: '/me/calendar/events',
        expirationDateTime: expirationDate.toISOString(),
        clientState,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create subscription: ${response.status} ${error}`);
    }

    const subscription = await response.json();

    // Update store with actual ID and expiration
    this.subscriptionStore.createSubscription(
      subscription.id,
      userId,
      subscription.resource,
      new Date(subscription.expirationDateTime),
      clientState,
    );

    // Schedule renewal 1 hour before expiration
    this.scheduleRenewal(subscription.id, userId, accessToken, new Date(subscription.expirationDateTime));

    return subscription;
  }

  async renewSubscription(accessToken: string, subscriptionId: string) {
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + 4230);

    const response = await fetch(`${this.graphApiUrl}/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expirationDateTime: expirationDate.toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to renew subscription: ${response.status}`);
    }

    const subscription = await response.json();
    this.subscriptionStore.updateExpiration(subscription.id, new Date(subscription.expirationDateTime));

    return subscription;
  }

  async deleteSubscription(accessToken: string, subscriptionId: string): Promise<void> {
    await fetch(`${this.graphApiUrl}/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    this.subscriptionStore.deleteSubscription(subscriptionId);
  }

  async deleteSubscriptionByUserId(accessToken: string, userId: string): Promise<void> {
    const sub = this.subscriptionStore.getSubscriptionByUserId(userId);
    if (sub) await this.deleteSubscription(accessToken, sub.subscriptionId);
  }

  private scheduleRenewal(subscriptionId: string, userId: string, accessToken: string, expirationDate: Date): void {
    const renewalTime = new Date(expirationDate.getTime() - 60 * 60 * 1000); // 1 hour before
    const delayMs = renewalTime.getTime() - Date.now();

    if (delayMs > 0) {
      const timeoutId = setTimeout(async () => {
        try {
          const renewed = await this.renewSubscription(accessToken, subscriptionId);
          this.scheduleRenewal(renewed.id, userId, accessToken, new Date(renewed.expirationDateTime));
        } catch (error) {
          this.logger.error(`Failed to auto-renew: ${error.message}`);
          this.subscriptionStore.deleteSubscription(subscriptionId);
        }
      }, delayMs);

      this.subscriptionStore.setRenewalTimeout(subscriptionId, timeoutId);
    }
  }

  validateNotification(subscriptionId: string, clientState: string): boolean {
    const sub = this.subscriptionStore.getSubscription(subscriptionId);
    return sub?.clientState === clientState;
  }
}
```

### Step 4: Create WebSocket Gateway

This handles WebSocket connections and broadcasts updates to clients.

```typescript
// calendar.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SessionStore } from './session.store';
import { SubscriptionService } from './subscription.service';
import { SubscriptionStore } from './subscription.store';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
}

@WebSocketGateway({
  namespace: '/calendar',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class CalendarGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CalendarGateway.name);
  private readonly userConnections = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly sessionStore: SessionStore,
    private readonly subscriptionService: SubscriptionService,
    private readonly subscriptionStore: SubscriptionStore,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      // Get JWT from handshake auth
      const token = client.handshake.auth?.token;
      if (!token) {
        client.disconnect();
        return;
      }

      // Verify JWT
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Get session
      const session = this.sessionStore.getUserSession(decoded.sessionId);
      if (!session) {
        this.logger.warn(`Session not found: ${decoded.sessionId}`);
        client.disconnect();
        return;
      }

      // Track connection
      client.userId = session.userId;
      client.sessionId = decoded.sessionId;

      if (!this.userConnections.has(session.userId)) {
        this.userConnections.set(session.userId, new Set());
      }
      this.userConnections.get(session.userId)!.add(client.id);

      this.logger.log(`Client connected: ${client.id} (User: ${session.userId})`);
      client.emit('connection_status', { status: 'connected', userId: session.userId });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    if (client.userId) {
      const connections = this.userConnections.get(client.userId);
      if (connections) {
        connections.delete(client.id);
        if (connections.size === 0) {
          this.userConnections.delete(client.userId);
        }
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_calendar')
  async handleSubscribeCalendar(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    if (!client.userId || !client.sessionId) {
      client.emit('subscription_error', { message: 'Not authenticated' });
      return;
    }

    const session = this.sessionStore.getUserSession(client.sessionId);
    if (!session) {
      client.emit('subscription_error', { message: 'Session expired' });
      return;
    }

    // Check if subscription already exists
    const existing = this.subscriptionStore.getSubscriptionByUserId(client.userId);
    if (existing) {
      client.emit('subscription_status', {
        status: 'active',
        subscriptionId: existing.subscriptionId,
        expiresAt: existing.expirationDateTime,
      });
      return;
    }

    try {
      const subscription = await this.subscriptionService.createSubscription(
        session.accessToken,
        client.userId,
      );
      client.emit('subscription_status', {
        status: 'active',
        subscriptionId: subscription.id,
        expiresAt: subscription.expirationDateTime,
      });
    } catch (error) {
      this.logger.error(`Subscription error: ${error.message}`);
      client.emit('subscription_error', { message: 'Failed to create subscription', error: error.message });
    }
  }

  @SubscribeMessage('unsubscribe_calendar')
  async handleUnsubscribeCalendar(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    if (!client.userId || !client.sessionId) return;

    const session = this.sessionStore.getUserSession(client.sessionId);
    if (session) {
      await this.subscriptionService.deleteSubscriptionByUserId(session.accessToken, client.userId);
    }
    client.emit('subscription_status', { status: 'inactive' });
  }

  broadcastCalendarUpdate(userId: string, update: any): void {
    const connections = this.userConnections.get(userId);
    if (!connections || connections.size === 0) return;

    this.logger.log(`Broadcasting to user: ${userId} (${connections.size} connections)`);
    for (const socketId of connections) {
      this.server.to(socketId).emit('calendar_update', update);
    }
  }
}
```

### Step 5: Create Webhook Controller

This receives notifications from Microsoft Graph.

```typescript
// webhook.controller.ts
import {
  Controller,
  Post,
  Query,
  Logger,
  HttpCode,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SubscriptionService } from './subscription.service';
import { SubscriptionStore } from './subscription.store';
import { SessionStore } from './session.store';
import { MicrosoftService } from './microsoft.service';
import { CalendarGateway } from './calendar.gateway';

@Controller('auth/microsoft/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly subscriptionStore: SubscriptionStore,
    private readonly sessionStore: SessionStore,
    private readonly microsoftService: MicrosoftService,
    private readonly calendarGateway: CalendarGateway,
  ) {}

  @Post('notifications')
  @HttpCode(HttpStatus.OK)
  async handleNotification(
    @Query('validationToken') validationToken: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Handle validation (sent during subscription creation)
    if (validationToken) {
      this.logger.log('[WEBHOOK] Validation request');
      res.status(HttpStatus.OK).contentType('text/plain').send(validationToken);
      return;
    }

    // Process notification (bypass ValidationPipe by using req.body directly)
    const notification = req.body;

    try {
      this.logger.log(`[WEBHOOK] Received ${notification?.value?.length || 0} notifications`);

      if (!notification?.value?.length) {
        res.status(HttpStatus.OK).send();
        return;
      }

      // Process asynchronously - respond to Microsoft immediately
      this.processNotifications(notification.value).catch(error => {
        this.logger.error(`Processing error: ${error.message}`);
      });

      res.status(HttpStatus.OK).send();
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send();
    }
  }

  private async processNotifications(notifications: any[]): Promise<void> {
    for (const item of notifications) {
      await this.processNotificationItem(item);
    }
  }

  private async processNotificationItem(item: any): Promise<void> {
    // Validate client state
    if (!this.subscriptionService.validateNotification(item.subscriptionId, item.clientState)) {
      this.logger.warn(`Invalid notification for ${item.subscriptionId}`);
      return;
    }

    const subscription = this.subscriptionStore.getSubscription(item.subscriptionId);
    if (!subscription) return;

    const userSession = this.sessionStore.getUserSessionByUserId(subscription.userId);
    if (!userSession) return;

    // Extract event ID from resource (format: "Users/{userId}/Events/{eventId}")
    const eventIdMatch = item.resource.match(/Events\/([^\/]+)/);
    const eventId = eventIdMatch?.[1] || item.resourceData?.id;
    if (!eventId) return;

    let calendarUpdate: any;

    if (item.changeType === 'deleted') {
      calendarUpdate = { id: eventId, deleted: true, changeType: 'deleted' };
    } else {
      try {
        const event = await this.microsoftService.getCalendarEvent(
          userSession.session.accessToken,
          eventId,
        );
        calendarUpdate = { ...event, changeType: item.changeType };
      } catch (error) {
        this.logger.error(`Failed to fetch event ${eventId}: ${error.message}`);
        return;
      }
    }

    this.logger.log(`Broadcasting ${item.changeType} for event ${eventId}`);
    this.calendarGateway.broadcastCalendarUpdate(subscription.userId, calendarUpdate);
  }
}
```

### Step 6: Add getCalendarEvent to MicrosoftService

```typescript
// In microsoft.service.ts, add this method:

async getCalendarEvent(accessToken: string, eventId: string): Promise<CalendarEventDto> {
  const response = await axios.get(
    `https://graph.microsoft.com/v1.0/me/calendar/events/${eventId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
    },
  );

  const event = response.data;
  return {
    id: event.id,
    subject: event.subject,
    startDateTime: event.start.dateTime,
    endDateTime: event.end.dateTime,
    location: event.location?.displayName,
    body: event.bodyPreview || event.body?.content,
    organizer: event.organizer?.emailAddress
      ? { name: event.organizer.emailAddress.name, email: event.organizer.emailAddress.address }
      : undefined,
    attendees: event.attendees?.map((a: any) => ({
      name: a.emailAddress.name,
      email: a.emailAddress.address,
      status: a.status.response,
    })),
    isAllDay: event.isAllDay || false,
    isCancelled: event.isCancelled || false,
  };
}
```

### Step 7: Add getUserSessionByUserId to SessionStore

```typescript
// In session.store.ts, add this method:

getUserSessionByUserId(userId: string): { sessionId: string; session: UserSession } | null {
  for (const [sessionId, session] of this.userSessions.entries()) {
    if (session.userId === userId) {
      if (Date.now() >= session.expiresAt) {
        this.userSessions.delete(sessionId);
        return null;
      }
      return { sessionId, session };
    }
  }
  return null;
}
```

### Step 8: Update Module Configuration

```typescript
// microsoft.module.ts
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
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
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
```

### Step 9: Update Logout to Delete Subscription

```typescript
// In microsoft.controller.ts, update logout:

@Post('logout')
@UseGuards(JwtAuthGuard)
async logout(@Request() req: any) {
  // Delete Graph subscription
  try {
    await this.subscriptionService.deleteSubscriptionByUserId(
      req.user.accessToken,
      req.user.userId,
    );
  } catch (error) {
    console.error('Failed to delete subscription:', error);
  }

  this.sessionStore.deleteUserSession(req.user.sessionId);
  return { success: true, message: 'Logged out successfully' };
}
```

---

## Frontend Implementation (React)

### Step 1: Create WebSocket Service

```typescript
// lib/websocket.ts
import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private calendarCallbacks: Set<(update: any) => void> = new Set();
  private statusCallbacks: Set<(status: any) => void> = new Set();
  private connectionCallbacks: Set<(connected: boolean) => void> = new Set();

  connect(token: string): void {
    if (this.socket?.connected && this.token === token) return;
    if (this.socket) this.disconnect();

    this.token = token;
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

    this.socket = io(`${wsUrl}/calendar`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.connectionCallbacks.forEach(cb => cb(true));
    });

    this.socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      this.connectionCallbacks.forEach(cb => cb(false));
    });

    this.socket.on('calendar_update', (update) => {
      console.log('[WebSocket] Calendar update:', update);
      this.calendarCallbacks.forEach(cb => cb(update));
    });

    this.socket.on('subscription_status', (status) => {
      console.log('[WebSocket] Subscription status:', status);
      this.statusCallbacks.forEach(cb => cb(status));
    });

    this.socket.on('subscription_error', (error) => {
      console.error('[WebSocket] Subscription error:', error);
      this.statusCallbacks.forEach(cb => cb({ status: 'error', error: error.message }));
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.token = null;
    this.connectionCallbacks.forEach(cb => cb(false));
  }

  subscribeToCalendar(): void {
    this.socket?.emit('subscribe_calendar', {});
  }

  unsubscribeFromCalendar(): void {
    this.socket?.emit('unsubscribe_calendar', {});
  }

  onCalendarUpdate(callback: (update: any) => void): () => void {
    this.calendarCallbacks.add(callback);
    return () => this.calendarCallbacks.delete(callback);
  }

  onSubscriptionStatus(callback: (status: any) => void): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  onConnectionStatus(callback: (connected: boolean) => void): () => void {
    this.connectionCallbacks.add(callback);
    callback(this.isConnected());
    return () => this.connectionCallbacks.delete(callback);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const websocketService = new WebSocketService();
```

### Step 2: Create React Hook

```typescript
// hooks/useCalendarWebSocket.ts
import { useEffect, useState, useCallback } from 'react';
import { websocketService } from '../lib/websocket';

interface UseCalendarWebSocketOptions {
  onUpdate?: (update: any) => void;
  autoSubscribe?: boolean;
}

interface SubscriptionStatus {
  status: 'active' | 'inactive' | 'error' | 'pending';
  subscriptionId?: string;
  expiresAt?: string;
  error?: string;
}

export function useCalendarWebSocket(options: UseCalendarWebSocketOptions = {}) {
  const { onUpdate, autoSubscribe = false } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({ status: 'inactive' });

  const subscribe = useCallback(() => {
    websocketService.subscribeToCalendar();
    setSubscriptionStatus({ status: 'pending' });
  }, []);

  const unsubscribe = useCallback(() => {
    websocketService.unsubscribeFromCalendar();
    setSubscriptionStatus({ status: 'inactive' });
  }, []);

  useEffect(() => {
    // IMPORTANT: Use the correct storage key where your auth stores the token
    const token = sessionStorage.getItem('auth_token'); // or localStorage.getItem('token')
    if (!token) {
      console.error('[useCalendarWebSocket] No token found');
      return;
    }

    websocketService.connect(token);

    const unsubConnection = websocketService.onConnectionStatus((connected) => {
      setIsConnected(connected);
      if (connected && autoSubscribe) {
        subscribe();
      }
    });

    const unsubCalendar = onUpdate ? websocketService.onCalendarUpdate(onUpdate) : undefined;
    const unsubStatus = websocketService.onSubscriptionStatus(setSubscriptionStatus);

    return () => {
      unsubConnection();
      unsubCalendar?.();
      unsubStatus();
      websocketService.disconnect();
    };
  }, [onUpdate, autoSubscribe, subscribe]);

  return { isConnected, subscriptionStatus, subscribe, unsubscribe };
}
```

### Step 3: Update Calendar Page

```tsx
// pages/CalendarPage.tsx
import { useCallback } from 'react';
import { useCalendarWebSocket } from '../hooks/useCalendarWebSocket';

export const CalendarPage = () => {
  const [events, setEvents] = useState([]);

  // Handle real-time updates
  const handleCalendarUpdate = useCallback((update: any) => {
    if (update.deleted) {
      setEvents(prev => prev.filter(e => e.id !== update.id));
    } else if (update.changeType === 'created') {
      const newEvent = {
        ...update,
        start: new Date(update.startDateTime),
        end: new Date(update.endDateTime),
        title: update.subject,
      };
      setEvents(prev => [...prev, newEvent]);
    } else if (update.changeType === 'updated') {
      setEvents(prev => prev.map(e =>
        e.id === update.id
          ? { ...update, start: new Date(update.startDateTime), end: new Date(update.endDateTime), title: update.subject }
          : e
      ));
    }
  }, []);

  // Connect to WebSocket
  const { isConnected, subscriptionStatus } = useCalendarWebSocket({
    onUpdate: handleCalendarUpdate,
    autoSubscribe: true,
  });

  return (
    <div>
      <h1>Calendar</h1>
      {isConnected && subscriptionStatus.status === 'active' && (
        <span className="live-badge">🟢 Live</span>
      )}
      {/* Your calendar component */}
    </div>
  );
};
```

---

## Environment Configuration

### Backend (.env)

```env
# Server
PORT=3000

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret

# URLs
MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback
FRONTEND_URL=http://localhost:5173
FRONTEND_REDIRECT_URI=http://localhost:5173/auth-callback

# Security
JWT_SECRET=your-secure-random-secret-key

# Webhooks - MUST be public HTTPS URL
WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok.io
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

---

## Local Development with ngrok

Microsoft Graph webhooks **require a public HTTPS URL**. Use ngrok for local development:

### Step 1: Install ngrok

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### Step 2: Start ngrok Tunnel

```bash
ngrok http 3000
```

### Step 3: Copy HTTPS URL

ngrok will display something like:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:3000
```

### Step 4: Update Backend .env

```env
WEBHOOK_BASE_URL=https://abc123.ngrok.io
```

### Step 5: Restart Backend

```bash
npm run start:dev
```

**Important:** Every time you restart ngrok, you get a new URL. Update `WEBHOOK_BASE_URL` accordingly.

---

## Testing the Implementation

### 1. Test Webhook Validation

```bash
curl "http://localhost:3000/auth/microsoft/webhook/notifications?validationToken=test123"
# Should return: test123
```

### 2. Test End-to-End

1. Start backend with ngrok running
2. Start frontend
3. Login to your app
4. Navigate to Calendar page
5. Verify "Live" badge appears
6. Open Outlook in another tab: https://outlook.office.com/calendar
7. Create a new event in Outlook
8. **Within 5-10 seconds**, the event should appear in your app automatically!

### 3. Check Logs

**Backend should show:**
```
[CalendarGateway] Client connected: xxx (User: xxx)
[SubscriptionService] Creating subscription for user xxx
[WEBHOOK] Received validation request
[SubscriptionService] Subscription created: xxx
...
[WEBHOOK] Received 1 notifications
[WEBHOOK] Broadcasting created for event xxx
[CalendarGateway] Broadcasting to user: xxx (1 connections)
```

**Browser console should show:**
```
[WebSocket] Connected
[WebSocket] Subscription status: { status: 'active', ... }
[WebSocket] Calendar update: { id: '...', subject: '...', changeType: 'created' }
```

---

## Troubleshooting

### Issue: "Live" badge not showing

**Causes:**
- Token not found in storage
- WebSocket connection failed
- CORS error

**Solutions:**
1. Check browser console for errors
2. Verify token storage key matches your auth service
3. Check backend CORS config includes frontend URL
4. Logout and login again

### Issue: Webhook validation fails

**Causes:**
- ngrok not running
- WEBHOOK_BASE_URL incorrect
- Firewall blocking

**Solutions:**
1. Verify ngrok is running: `ngrok http 3000`
2. Test endpoint: `curl "https://your-ngrok-url/auth/microsoft/webhook/notifications?validationToken=test"`
3. Check WEBHOOK_BASE_URL matches ngrok URL

### Issue: "Session not found" error

**Cause:** Backend restarted, clearing in-memory sessions

**Solution:** Logout and login again to create new session

### Issue: Validation pipe blocking webhooks

**Cause:** NestJS global ValidationPipe with `forbidNonWhitelisted: true`

**Solution:** Use `@Req()` to get raw body in webhook controller (bypasses validation)

### Issue: Notifications received but calendar doesn't update

**Causes:**
- WebSocket broadcast failing
- Frontend callback not registered

**Solutions:**
1. Check backend logs for "Broadcasting" message
2. Check browser console for "Calendar update received"
3. Verify `handleCalendarUpdate` callback is passed to hook

---

## Production Considerations

### 1. Persistent Storage

Replace in-memory stores with Redis or database:

```typescript
// Use Redis for sessions and subscriptions
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Store session
await redis.set(`session:${sessionId}`, JSON.stringify(session), 'EX', 3600);

// Retrieve session
const session = JSON.parse(await redis.get(`session:${sessionId}`));
```

### 2. Multiple Instances

Use Redis adapter for Socket.IO:

```typescript
import { createAdapter } from '@socket.io/redis-adapter';

const pubClient = new Redis(process.env.REDIS_URL);
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### 3. HTTPS Certificate

In production, ensure your webhook endpoint has a valid SSL certificate (not self-signed).

### 4. Error Handling

Add retry logic for failed Graph API calls:

```typescript
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries reached');
}
```

### 5. Monitoring

Add logging and metrics for:
- WebSocket connections/disconnections
- Subscription create/renew/delete
- Webhook notifications received
- Errors and failures

---

## Summary

### Key Concepts

1. **Microsoft Graph Subscriptions**: Register for change notifications on resources (calendar events)
2. **Webhook Endpoint**: Receive HTTP POST from Microsoft when changes occur
3. **Client State**: Secret token to validate webhook notifications
4. **Subscription Expiration**: Max 70.5 hours, auto-renew before expiration
5. **WebSockets**: Push updates to connected clients in real-time

### Flow Recap

1. User connects → WebSocket authenticated via JWT
2. Client subscribes → Backend creates Graph subscription
3. Microsoft validates → Backend returns validation token
4. Change occurs → Microsoft POSTs to webhook
5. Backend processes → Fetches event, broadcasts via WebSocket
6. Client receives → Updates UI in real-time

### Files Created/Modified

**Backend:**
- `subscription.store.ts` - Track subscriptions
- `subscription.service.ts` - Graph API subscription management
- `calendar.gateway.ts` - WebSocket server
- `webhook.controller.ts` - Webhook endpoint
- `microsoft.service.ts` - Added `getCalendarEvent()`
- `session.store.ts` - Added `getUserSessionByUserId()`
- `microsoft.module.ts` - Register new providers
- `microsoft.controller.ts` - Delete subscription on logout

**Frontend:**
- `lib/websocket.ts` - WebSocket client service
- `hooks/useCalendarWebSocket.ts` - React hook
- `pages/CalendarPage.tsx` - UI integration

---

## Quick Reference

### Microsoft Graph Subscription API

```
POST https://graph.microsoft.com/v1.0/subscriptions
{
  "changeType": "created,updated,deleted",
  "notificationUrl": "https://your-domain.com/webhook",
  "resource": "/me/calendar/events",
  "expirationDateTime": "2024-01-01T00:00:00Z",
  "clientState": "your-secret-state"
}
```

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `subscribe_calendar` | Client → Server | Request Graph subscription |
| `unsubscribe_calendar` | Client → Server | Delete Graph subscription |
| `subscription_status` | Server → Client | Subscription state update |
| `subscription_error` | Server → Client | Error creating subscription |
| `calendar_update` | Server → Client | Calendar event changed |
| `connection_status` | Server → Client | Connection confirmed |

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `WEBHOOK_BASE_URL` | Public HTTPS URL for webhooks | `https://abc.ngrok.io` |
| `VITE_WS_URL` | WebSocket server URL | `http://localhost:3000` |
| `JWT_SECRET` | Secret for JWT signing | Random secure string |

---

*Last updated: January 2026*
