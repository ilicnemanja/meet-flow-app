import { io, Socket } from 'socket.io-client';

type CalendarUpdateCallback = (update: any) => void;
type SubscriptionStatusCallback = (status: any) => void;
type ConnectionStatusCallback = (isConnected: boolean) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private calendarUpdateCallbacks: Set<CalendarUpdateCallback> = new Set();
  private subscriptionStatusCallbacks: Set<SubscriptionStatusCallback> = new Set();
  private connectionStatusCallbacks: Set<ConnectionStatusCallback> = new Set();

  /**
   * Connect to WebSocket server
   */
  connect(token: string): void {
    if (this.socket?.connected && this.token === token) {
      console.log('[WebSocket] Already connected');
      return;
    }

    // Disconnect existing connection if any
    if (this.socket) {
      this.disconnect();
    }

    this.token = token;

    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
    console.log('[WebSocket] Connecting to:', `${wsUrl}/calendar`);

    this.socket = io(`${wsUrl}/calendar`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('[WebSocket] Disconnecting');
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
      this.notifyConnectionStatus(false);
    }
  }

  /**
   * Subscribe to calendar events (create Graph subscription)
   */
  subscribeToCalendar(): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Cannot subscribe: not connected');
      return;
    }

    console.log('[WebSocket] Subscribing to calendar updates');
    this.socket.emit('subscribe_calendar', {});
  }

  /**
   * Unsubscribe from calendar events (delete Graph subscription)
   */
  unsubscribeFromCalendar(): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Cannot unsubscribe: not connected');
      return;
    }

    console.log('[WebSocket] Unsubscribing from calendar updates');
    this.socket.emit('unsubscribe_calendar', {});
  }

  /**
   * Register callback for calendar updates
   */
  onCalendarUpdate(callback: CalendarUpdateCallback): () => void {
    this.calendarUpdateCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.calendarUpdateCallbacks.delete(callback);
    };
  }

  /**
   * Register callback for subscription status updates
   */
  onSubscriptionStatus(callback: SubscriptionStatusCallback): () => void {
    this.subscriptionStatusCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscriptionStatusCallbacks.delete(callback);
    };
  }

  /**
   * Register callback for connection status changes
   */
  onConnectionStatus(callback: ConnectionStatusCallback): () => void {
    this.connectionStatusCallbacks.add(callback);

    // Immediately call with current status
    callback(this.isConnected());

    // Return unsubscribe function
    return () => {
      this.connectionStatusCallbacks.delete(callback);
    };
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Setup Socket.IO event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.notifyConnectionStatus(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.notifyConnectionStatus(false);
    });

    this.socket.on('connection_status', (data) => {
      console.log('[WebSocket] Connection status:', data);
    });

    // Calendar update events
    this.socket.on('calendar_update', (update) => {
      console.log('[WebSocket] Calendar update received:', update);
      this.notifyCalendarUpdate(update);
    });

    // Subscription status events
    this.socket.on('subscription_status', (status) => {
      console.log('[WebSocket] Subscription status:', status);
      this.notifySubscriptionStatus(status);
    });

    this.socket.on('subscription_error', (error) => {
      console.error('[WebSocket] Subscription error:', error);
      this.notifySubscriptionStatus({ status: 'error', error: error.message });
    });

    // Error events
    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });

    this.socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });
  }

  /**
   * Notify all calendar update callbacks
   */
  private notifyCalendarUpdate(update: any): void {
    this.calendarUpdateCallbacks.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('[WebSocket] Error in calendar update callback:', error);
      }
    });
  }

  /**
   * Notify all subscription status callbacks
   */
  private notifySubscriptionStatus(status: any): void {
    this.subscriptionStatusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('[WebSocket] Error in subscription status callback:', error);
      }
    });
  }

  /**
   * Notify all connection status callbacks
   */
  private notifyConnectionStatus(isConnected: boolean): void {
    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback(isConnected);
      } catch (error) {
        console.error('[WebSocket] Error in connection status callback:', error);
      }
    });
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
