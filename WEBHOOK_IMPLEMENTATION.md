# Implementation Plan: Microsoft Graph Webhooks + Real-Time Calendar Updates

## Overview

Add real-time calendar synchronization using Microsoft Graph Change Notifications (webhooks) and Socket.IO WebSockets. When events are created/updated/deleted in Microsoft 365 (Outlook, Teams, mobile), your application will automatically receive and display these changes without manual refresh.

## Architecture

```
Microsoft Graph API
    ↓ (webhook notification)
NestJS Backend
    ├── Webhook Endpoint (receives notifications)
    ├── Subscription Service (manages Graph subscriptions)
    └── WebSocket Gateway (broadcasts to clients)
    ↓ (Socket.IO)
React Frontend (CalendarPage updates in real-time)
```

## Key Design Decisions

1. **Subscription Storage**: In-memory Map (like SessionStore) - simple for MVP, subscriptions recreated on restart
2. **Subscription Scope**: Per-user subscriptions for security isolation
3. **Notification Strategy**: Fetch only changed event (delta updates) - more efficient than full refresh
4. **WebSocket Auth**: JWT token in handshake auth data - secure, no token exposure in URLs
5. **Lifecycle**: Create subscription on calendar page load, auto-renew (70.5hr max), delete on logout

## Dependencies to Install

### Backend
```bash
cd apps/backend
npm install --save @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install --save-dev @types/socket.io
```

### Frontend
```bash
cd apps/frontend
npm install --save socket.io-client
npm install --save-dev @types/socket.io-client
```

## Implementation Steps

### Phase 0: Documentation Setup

**0.1 Create Reference Documentation**
- File: `WEBHOOK_IMPLEMENTATION.md` (project root)
- Copy this entire plan as permanent reference
- Include all implementation details, code patterns, and testing steps
- Keep as living document to update during implementation

### Phase 1: Backend - Subscription Management

**1.1 Create Subscription Store**
- File: `apps/backend/src/auth/microsoft/subscription.store.ts`
- Mirror SessionStore pattern with Map-based storage
- Track: subscriptionId, userId, resourcePath, expirationDateTime, clientState
- Auto-cleanup expired subscriptions

**1.2 Create DTOs**
- File: `apps/backend/src/auth/microsoft/dto/subscription.dto.ts`
- WebhookValidationDto (validationToken)
- WebhookNotificationDto (notification payload from Microsoft)
- NotificationItem (changeType: created/updated/deleted)

**1.3 Create Subscription Service**
- File: `apps/backend/src/auth/microsoft/subscription.service.ts`
- Methods:
  - `createSubscription()` - POST to Microsoft Graph `/subscriptions`
  - `renewSubscription()` - PATCH before expiration
  - `deleteSubscription()` - DELETE on logout
  - `validateNotification()` - Check clientState matches
  - `scheduleRenewal()` - Auto-renew 1 hour before expiration
- Microsoft Graph endpoint: `https://graph.microsoft.com/v1.0/subscriptions`
- Resource: `/me/calendar/events`
- ChangeTypes: `created,updated,deleted`
- Max expiration: 4230 minutes (70.5 hours)

**1.4 Update SessionStore**
- File: `apps/backend/src/auth/microsoft/session.store.ts`
- Add method: `getUserSessionByUserId(userId)` - needed for webhook notifications

### Phase 2: Backend - Webhook Endpoint

**2.1 Create Webhook Controller**
- File: `apps/backend/src/auth/microsoft/webhook.controller.ts`
- Endpoint: `POST /auth/microsoft/webhook/notifications`
- Handle validation token (Microsoft sends on subscription creation) - return as plain text
- Process notifications:
  1. Get subscription from store
  2. Validate clientState
  3. Get user session for access token
  4. Extract eventId from resource URL
  5. If deleted: send {id, deleted: true}
  6. Otherwise: fetch full event via MicrosoftService
  7. Broadcast to WebSocket clients via CalendarGateway

**2.2 Update MicrosoftService**
- File: `apps/backend/src/auth/microsoft/microsoft.service.ts`
- Add method: `getCalendarEvent(accessToken, eventId)` - fetch single event
- Endpoint: `GET https://graph.microsoft.com/v1.0/me/calendar/events/{eventId}`

### Phase 3: Backend - WebSocket Gateway

**3.1 Create Calendar Gateway**
- File: `apps/backend/src/auth/microsoft/calendar.gateway.ts`
- Namespace: `/calendar`
- CORS: Allow frontend URL from env
- Track connections: `Map<userId, Set<socketId>>`
- Implement:
  - `handleConnection()` - Authenticate via JWT from handshake.auth.token
  - `handleDisconnect()` - Clean up user connections
  - `@SubscribeMessage('subscribe_calendar')` - Create Graph subscription
  - `@SubscribeMessage('unsubscribe_calendar')` - Delete Graph subscription
  - `broadcastCalendarUpdate(userId, update)` - Send to all user's sockets

### Phase 4: Backend - Module Configuration

**4.1 Update MicrosoftModule**
- File: `apps/backend/src/auth/microsoft/microsoft.module.ts`
- Add providers: SubscriptionStore, SubscriptionService, CalendarGateway
- Add controller: WebhookController
- Export: CalendarGateway

**4.2 Update MicrosoftController Logout**
- File: `apps/backend/src/auth/microsoft/microsoft.controller.ts`
- Delete Graph subscription on logout
- Inject SubscriptionStore and SubscriptionService in constructor

### Phase 5: Frontend - WebSocket Client

**5.1 Create WebSocket Service**
- File: `apps/frontend/src/lib/websocket.ts`
- Singleton service wrapping Socket.IO client
- Connect to: `${VITE_WS_URL}/calendar` with JWT in auth object
- Methods:
  - `connect()` - Establish connection with token
  - `disconnect()` - Clean up
  - `subscribeToCalendar()` - Emit 'subscribe_calendar'
  - `onCalendarUpdate(callback)` - Listen for 'calendar_update' events
  - `onSubscriptionStatus(callback)` - Listen for status updates

**5.2 Create React Hook**
- File: `apps/frontend/src/hooks/useCalendarWebSocket.ts`
- Manage WebSocket lifecycle in React
- Auto-connect on mount, disconnect on unmount
- Auto-subscribe if enabled
- Return: isConnected, subscriptionStatus, subscribe(), unsubscribe()

### Phase 6: Frontend - Calendar Integration

**6.1 Update CalendarPage**
- File: `apps/frontend/src/pages/CalendarPage.tsx`
- Add import: `useCalendarWebSocket` hook
- Add callback: `handleCalendarUpdate(update)` that:
  - If deleted: remove event from state
  - If created: add event to state
  - If updated: replace event in state
- Use hook: `useCalendarWebSocket({ onUpdate: handleCalendarUpdate, autoSubscribe: true })`
- Add status indicator: Show "Live" badge when `isConnected && subscriptionStatus === 'active'`

## Configuration

### Backend Environment
```env
# Add to apps/backend/.env
WEBHOOK_BASE_URL=https://your-public-domain.com  # Required: public HTTPS URL
```

### Frontend Environment
```env
# Add to apps/frontend/.env
VITE_WS_URL=http://localhost:3000
```

## Development Setup (Local Testing)

Microsoft Graph webhooks require public HTTPS endpoint. Use ngrok:

```bash
# Install ngrok
brew install ngrok  # macOS

# Start tunnel
ngrok http 3000

# Copy HTTPS URL (e.g., https://abc123.ngrok.io)
# Set in backend .env: WEBHOOK_BASE_URL=https://abc123.ngrok.io
```

## Critical Files

1. `apps/backend/src/auth/microsoft/subscription.service.ts` - Core webhook logic
2. `apps/backend/src/auth/microsoft/calendar.gateway.ts` - WebSocket server
3. `apps/backend/src/auth/microsoft/webhook.controller.ts` - Webhook endpoint
4. `apps/frontend/src/hooks/useCalendarWebSocket.ts` - React WebSocket hook
5. `apps/frontend/src/pages/CalendarPage.tsx` - UI integration

## Verification & Testing

### Test Webhook Validation
```bash
curl -X POST "http://localhost:3000/auth/microsoft/webhook/notifications?validationToken=test123"
# Should return: test123
```

### Test End-to-End
1. Start backend with ngrok
2. Load calendar page in browser
3. Open Outlook web/app in another tab
4. Create/update/delete event in Outlook
5. Verify event appears/updates/disappears in your app within 5-10 seconds
6. Check "Live" badge shows active status

### Check WebSocket Connection
Browser console:
```javascript
// Should see "WebSocket connected" log
// Should see "Live" badge in header
```

### Check Backend Logs
Should see:
- "Client connected: [socket-id] (User: [user-id])"
- "[WEBHOOK] Received notification: ..."
- "Broadcasting calendar update to user: [user-id]"

## Important Notes

1. **Subscription Expiration**: Microsoft Graph subscriptions expire after 70.5 hours. The SubscriptionService auto-renews 1 hour before expiration. If renewal fails, subscription is recreated on next calendar page load.

2. **Production Requirements**:
   - HTTPS endpoint (required by Microsoft)
   - Consider Redis/database for subscription persistence
   - Use Redis adapter for Socket.IO in multi-instance deployments

3. **Security**:
   - Always validate clientState in webhook notifications
   - Verify JWT on WebSocket connections
   - Use HTTPS in production

4. **Error Handling**:
   - Webhook failures logged but don't crash server
   - WebSocket disconnections auto-reconnect
   - Subscription creation failures fall back to polling

## Trade-offs

**In-Memory Storage** (Chosen for MVP):
- ✅ Simple, fast, no external dependencies
- ❌ Lost on restart, not scalable to multiple instances
- For production: migrate to Redis

**Delta Updates** (Chosen):
- ✅ Efficient, lower API usage
- ❌ More complex logic
- Alternative: Full refresh on each notification (simpler but wasteful)

**WebSockets** (Chosen):
- ✅ Bidirectional, widely supported
- ❌ More complex than SSE
- Alternative: Server-Sent Events (simpler, unidirectional only)

## Implementation Status

Track completion of each phase:

- [x] Phase 0: Documentation Setup
- [ ] Phase 1: Backend - Subscription Management
- [ ] Phase 2: Backend - Webhook Endpoint
- [ ] Phase 3: Backend - WebSocket Gateway
- [ ] Phase 4: Backend - Module Configuration
- [ ] Phase 5: Frontend - WebSocket Client
- [ ] Phase 6: Frontend - Calendar Integration
