# WebSocket Real-Time Calendar Debugging Guide

## Step 1: Restart Backend

After the CORS fix, restart your backend server:

```bash
cd apps/backend
npm run start:dev
```

**Look for these logs on startup:**
- No errors about Socket.IO or WebSocket
- Server should start on port 3000

## Step 2: Check Browser Console

Open your app in browser, go to Calendar page, and open DevTools (F12).

**You should see these logs:**

```
[WebSocket] Connecting to: http://localhost:3000/calendar
[WebSocket] Connected
[WebSocket] Connection status: { status: 'connected', userId: '...' }
[WebSocket] Subscribing to calendar updates
[WebSocket] Subscription status: { status: 'active', subscriptionId: '...', expiresAt: '...' }
```

**If you see errors:**

### Error: "Connection failed" or "ERR_CONNECTION_REFUSED"
- Backend is not running or not accessible
- Check backend terminal for errors
- Verify `VITE_WS_URL=http://localhost:3000` in frontend/.env

### Error: "CORS error"
- CORS mismatch between frontend and backend
- Check backend/.env `FRONTEND_URL` matches your frontend port
- I just fixed this - restart backend!

### Error: "Unauthorized" or "Invalid token"
- Token is missing or expired
- Logout and login again to get a fresh token
- Check localStorage has 'token' key

## Step 3: Check Backend Logs

When you load the Calendar page, backend should log:

```
[CalendarGateway] Client connected: <socket-id> (User: <user-id>)
[SubscriptionService] Creating subscription for user <user-id>
[SubscriptionService] Subscription created: <subscription-id> for user <user-id>
[CalendarGateway] Subscription created for user <user-id>: <subscription-id>
```

**If you don't see these:**

### No "Client connected" log
- WebSocket connection failed
- Check CORS configuration
- Check frontend is using correct token
- Verify JWT_SECRET matches between frontend token and backend

### No "Creating subscription" log
- Frontend not sending subscription request
- Check browser console for errors
- Verify `autoSubscribe: true` in CalendarPage

### "Failed to create subscription" error
- Microsoft Graph API error
- Check `WEBHOOK_BASE_URL` is set to your ngrok HTTPS URL
- Verify ngrok tunnel is running: `ngrok http 3000`
- Verify Azure permissions include `Calendars.ReadWrite`

## Step 4: Check the "Live" Badge

On the Calendar page header, you should see a green "Live" badge with a pulsing icon.

**If badge is not showing:**
- WebSocket not connected OR subscription not active
- Check browser console and backend logs from Steps 2-3

**Badge shows but updates don't work:**
- Test the webhook endpoint (see Step 5)

## Step 5: Test Webhook Endpoint

Test if Microsoft can reach your webhook:

```bash
# Test validation endpoint (should return "test123")
curl "http://localhost:3000/auth/microsoft/webhook/notifications?validationToken=test123"
```

**Should return:** `test123`

**Test via ngrok URL:**
```bash
curl "https://YOUR-NGROK-URL.ngrok.io/auth/microsoft/webhook/notifications?validationToken=test123"
```

**Should also return:** `test123`

If this doesn't work:
- Backend not running
- Ngrok tunnel not active
- Firewall blocking connections

## Step 6: Test End-to-End

1. Open your app calendar page (should show "Live" badge)
2. Open Outlook web in another browser tab: https://outlook.office.com/calendar
3. Create a new event in Outlook
4. Wait 5-10 seconds
5. Check your app - event should appear automatically!

**If event doesn't appear:**

Check backend logs for webhook notification:
```
[WEBHOOK] Received notification with X items
[WEBHOOK] Processing created notification for subscription <id>
[WEBHOOK] Broadcasting created update for event <id> to user <user-id>
[CalendarGateway] Broadcasting calendar update to user: <user-id> (1 connections)
```

**If you see webhook notification but event doesn't update:**
- Check browser console for `[WebSocket] Calendar update received:`
- Check CalendarPage update handler is working
- Verify event dates are within calendar view range

## Step 7: Common Issues & Solutions

### Issue: "Live" badge never shows
**Solution:**
1. Check token exists: `localStorage.getItem('token')` in browser console
2. Logout and login again
3. Check backend logs for connection errors
4. Verify CORS fix was applied (restart backend)

### Issue: Badge shows, but no webhook notifications received
**Solution:**
1. Verify ngrok is running: `ngrok http 3000`
2. Verify `WEBHOOK_BASE_URL` in backend/.env matches ngrok HTTPS URL
3. Test webhook validation (Step 5)
4. Check subscription was created in backend logs
5. Microsoft might take 1-2 minutes to start sending notifications

### Issue: Webhook notifications received but frontend doesn't update
**Solution:**
1. Check browser console for `[WebSocket] Calendar update received:`
2. Verify `handleCalendarUpdate` callback is registered
3. Check event is in current calendar view date range
4. Try refreshing the calendar page

### Issue: "Failed to create subscription" - 400 Bad Request
**Solution:**
- `WEBHOOK_BASE_URL` must be HTTPS (not HTTP)
- URL must be publicly accessible by Microsoft servers
- Test your ngrok URL is accessible externally

### Issue: "Failed to create subscription" - 403 Forbidden
**Solution:**
- Missing `Calendars.ReadWrite` permission in Azure Portal
- Go to Azure Portal → Your App → API Permissions
- Add and grant `Calendars.ReadWrite` permission
- Logout and login again to get new consent

## Quick Checklist

Before asking for help, verify:

- [ ] Backend is running (port 3000)
- [ ] Ngrok is running with HTTPS tunnel
- [ ] `WEBHOOK_BASE_URL` in backend/.env is set to ngrok HTTPS URL
- [ ] `VITE_WS_URL` in frontend/.env is `http://localhost:3000`
- [ ] You're logged in with a valid token
- [ ] Browser console shows WebSocket connected
- [ ] Backend logs show "Client connected"
- [ ] Backend logs show "Subscription created"
- [ ] "Live" badge is visible on calendar page
- [ ] Webhook validation endpoint works (Step 5)

## Still Not Working?

Share the following information:

1. **Browser Console Output** (all logs starting with `[WebSocket]`)
2. **Backend Console Output** (especially CalendarGateway and SubscriptionService logs)
3. **Ngrok URL** (from `ngrok http 3000`)
4. **WEBHOOK_BASE_URL** (from backend/.env)
5. **Any error messages** you're seeing

## Environment URLs Summary

Your current setup:
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:4200`
- Ngrok: `https://5863cb39ce89.ngrok-free.app`
- WebSocket: `http://localhost:3000/calendar`

Make sure these are all correct and accessible!
