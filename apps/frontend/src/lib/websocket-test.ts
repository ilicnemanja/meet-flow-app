// Simple WebSocket connection test
// Run this in browser console to test WebSocket connection

export function testWebSocketConnection() {
  console.log('=== WebSocket Connection Test ===');

  // Check environment variables
  const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
  console.log('1. WebSocket URL:', wsUrl);

  // Check token
  const token = localStorage.getItem('token');
  console.log('2. Token exists:', !!token);
  if (token) {
    console.log('   Token preview:', token.substring(0, 20) + '...');
  }

  // Try to import and connect
  import('./websocket').then(({ websocketService }) => {
    console.log('3. WebSocket service imported');

    if (token) {
      console.log('4. Attempting connection...');
      websocketService.connect(token);

      setTimeout(() => {
        console.log('5. Connection status:', websocketService.isConnected());
      }, 2000);
    }
  });
}

// Make it available in console
(window as any).testWebSocket = testWebSocketConnection;

console.log('WebSocket test loaded. Run: testWebSocket()');
