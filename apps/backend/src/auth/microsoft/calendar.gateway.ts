import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
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
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:4200',
      'http://localhost:5173',
    ],
    credentials: true,
  },
})
export class CalendarGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CalendarGateway.name);
  private readonly userConnections = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly sessionStore: SessionStore,
    private readonly subscriptionService: SubscriptionService,
    private readonly subscriptionStore: SubscriptionStore,
  ) {}

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      // Extract JWT token from handshake auth
      const token = client.handshake.auth?.token;
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      let decoded: any;
      try {
        decoded = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
      } catch (error) {
        this.logger.warn(`Connection rejected: Invalid token`);
        client.disconnect();
        return;
      }

      const sessionId = decoded.sessionId;
      if (!sessionId) {
        this.logger.warn(`Connection rejected: No sessionId in token`);
        client.disconnect();
        return;
      }

      // Get user session
      const session = this.sessionStore.getUserSession(sessionId);
      if (!session) {
        this.logger.warn(`Connection rejected: Session not found: ${sessionId}`);
        client.disconnect();
        return;
      }

      // Attach userId and sessionId to socket
      client.userId = session.userId;
      client.sessionId = sessionId;

      // Track connection
      if (!this.userConnections.has(session.userId)) {
        this.userConnections.set(session.userId, new Set());
      }
      this.userConnections.get(session.userId)!.add(client.id);

      this.logger.log(`Client connected: ${client.id} (User: ${session.userId})`);

      // Send connection confirmation
      client.emit('connection_status', {
        status: 'connected',
        userId: session.userId,
      });
    } catch (error) {
      this.logger.error(`Error during connection: ${error.message}`, error.stack);
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  handleDisconnect(client: AuthenticatedSocket): void {
    try {
      if (client.userId) {
        const connections = this.userConnections.get(client.userId);
        if (connections) {
          connections.delete(client.id);
          if (connections.size === 0) {
            this.userConnections.delete(client.userId);
            this.logger.log(`All connections closed for user: ${client.userId}`);
          }
        }
      }

      this.logger.log(`Client disconnected: ${client.id}`);
    } catch (error) {
      this.logger.error(`Error during disconnect: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle calendar subscription request
   */
  @SubscribeMessage('subscribe_calendar')
  async handleSubscribeCalendar(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: any,
  ): Promise<void> {
    try {
      if (!client.userId || !client.sessionId) {
        client.emit('subscription_error', { message: 'Not authenticated' });
        return;
      }

      const session = this.sessionStore.getUserSession(client.sessionId);
      if (!session) {
        client.emit('subscription_error', { message: 'Session expired' });
        return;
      }

      this.logger.log(`Creating calendar subscription for user: ${client.userId}`);

      // Check if subscription already exists
      const existingSubscription = this.subscriptionStore.getSubscriptionByUserId(client.userId);
      if (existingSubscription) {
        this.logger.log(`Subscription already exists for user: ${client.userId}`);
        client.emit('subscription_status', {
          status: 'active',
          subscriptionId: existingSubscription.subscriptionId,
          expiresAt: existingSubscription.expirationDateTime,
        });
        return;
      }

      // Create new subscription
      const subscription = await this.subscriptionService.createSubscription(
        session.accessToken,
        client.userId,
      );

      this.logger.log(`Subscription created for user ${client.userId}: ${subscription.id}`);

      // Notify client
      client.emit('subscription_status', {
        status: 'active',
        subscriptionId: subscription.id,
        expiresAt: subscription.expirationDateTime,
      });
    } catch (error) {
      this.logger.error(`Error creating subscription: ${error.message}`, error.stack);
      client.emit('subscription_error', {
        message: 'Failed to create subscription',
        error: error.message,
      });
    }
  }

  /**
   * Handle calendar unsubscription request
   */
  @SubscribeMessage('unsubscribe_calendar')
  async handleUnsubscribeCalendar(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: any,
  ): Promise<void> {
    try {
      if (!client.userId || !client.sessionId) {
        client.emit('subscription_error', { message: 'Not authenticated' });
        return;
      }

      const session = this.sessionStore.getUserSession(client.sessionId);
      if (!session) {
        client.emit('subscription_error', { message: 'Session expired' });
        return;
      }

      this.logger.log(`Deleting calendar subscription for user: ${client.userId}`);

      await this.subscriptionService.deleteSubscriptionByUserId(
        session.accessToken,
        client.userId,
      );

      // Notify client
      client.emit('subscription_status', {
        status: 'inactive',
      });
    } catch (error) {
      this.logger.error(`Error deleting subscription: ${error.message}`, error.stack);
      client.emit('subscription_error', {
        message: 'Failed to delete subscription',
        error: error.message,
      });
    }
  }

  /**
   * Broadcast calendar update to all user's connected clients
   */
  broadcastCalendarUpdate(userId: string, update: any): void {
    try {
      const connections = this.userConnections.get(userId);
      if (!connections || connections.size === 0) {
        this.logger.debug(`No active connections for user: ${userId}`);
        return;
      }

      this.logger.log(`Broadcasting calendar update to user: ${userId} (${connections.size} connections)`);

      // Send to all user's sockets
      for (const socketId of connections) {
        this.server.to(socketId).emit('calendar_update', update);
      }
    } catch (error) {
      this.logger.error(`Error broadcasting calendar update: ${error.message}`, error.stack);
    }
  }
}
