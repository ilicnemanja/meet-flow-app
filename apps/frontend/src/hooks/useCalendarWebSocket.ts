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
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    status: 'inactive',
  });

  // Subscribe to calendar events
  const subscribe = useCallback(() => {
    websocketService.subscribeToCalendar();
    setSubscriptionStatus({ status: 'pending' });
  }, []);

  // Unsubscribe from calendar events
  const unsubscribe = useCallback(() => {
    websocketService.unsubscribeFromCalendar();
    setSubscriptionStatus({ status: 'inactive' });
  }, []);

  useEffect(() => {
    console.log('[useCalendarWebSocket] Hook mounted, autoSubscribe:', autoSubscribe);

    // Get token from sessionStorage (where authService stores it)
    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      console.error('[useCalendarWebSocket] No token found in sessionStorage');
      return;
    }

    console.log('[useCalendarWebSocket] Token found, connecting...');

    // Connect to WebSocket
    websocketService.connect(token);

    // Setup connection status listener
    const unsubConnectionStatus = websocketService.onConnectionStatus((connected) => {
      setIsConnected(connected);

      // Auto-subscribe if requested and just connected
      if (connected && autoSubscribe) {
        subscribe();
      }
    });

    // Setup calendar update listener
    let unsubCalendarUpdate: (() => void) | undefined;
    if (onUpdate) {
      unsubCalendarUpdate = websocketService.onCalendarUpdate(onUpdate);
    }

    // Setup subscription status listener
    const unsubSubscriptionStatus = websocketService.onSubscriptionStatus((status) => {
      setSubscriptionStatus(status);
    });

    // Cleanup on unmount
    return () => {
      unsubConnectionStatus();
      unsubCalendarUpdate?.();
      unsubSubscriptionStatus();

      // Disconnect from WebSocket
      websocketService.disconnect();
    };
  }, [onUpdate, autoSubscribe, subscribe]);

  return {
    isConnected,
    subscriptionStatus,
    subscribe,
    unsubscribe,
  };
}
