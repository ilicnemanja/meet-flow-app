# MeetFlow App - Setup Guide

This guide will help you set up the production-ready Microsoft Graph integration for authentication and email sending.

## Prerequisites

- Node.js installed
- Microsoft Azure account
- Microsoft 365 account for testing

## 1. Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations** > **New registration**
3. Fill in the following:
   - **Name**: MeetFlow App (or your preferred name)
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**:
     - Platform: Web
     - URI: `http://localhost:3000/auth/microsoft/callback`
4. Click **Register**

5. After registration, note down the **Application (client) ID**

6. Go to **Certificates & secrets** > **New client secret**
   - Description: MeetFlow Secret
   - Expires: Choose your preference
   - Click **Add**
   - **Important**: Copy the secret **Value** immediately (you won't be able to see it again)

7. Go to **API permissions**
   - Click **Add a permission**
   - Select **Microsoft Graph** > **Delegated permissions**
   - Add the following permissions:
     - `openid`
     - `profile`
     - `email`
     - `offline_access`
     - `Calendars.ReadWrite`
     - `Mail.Send`
     - `User.Read`
   - Click **Add permissions**
   - Click **Grant admin consent** (if you have admin rights)

## 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd apps/backend
   ```

2. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file and fill in your values:
   ```env
   PORT=3000

   # From Azure App Registration
   MICROSOFT_CLIENT_ID=your-application-client-id
   MICROSOFT_CLIENT_SECRET=your-client-secret-value

   # Backend callback (should match Azure redirect URI)
   MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback

   # Frontend URLs
   FRONTEND_URL=http://localhost:5173
   FRONTEND_REDIRECT_URI=http://localhost:5173/auth-callback

   # Generate a random secret for production
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

4. Install dependencies (if not already done):
   ```bash
   npm install
   ```

5. Start the backend server:
   ```bash
   npm run start:dev
   ```

   The backend should now be running on `http://localhost:3000`

## 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd apps/frontend
   ```

2. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file:
   ```env
   VITE_API_URL=http://localhost:3000
   ```

4. Install dependencies (if not already done):
   ```bash
   npm install
   ```

5. Start the frontend development server:
   ```bash
   npm run start:dev
   ```

   The frontend should now be running on `http://localhost:5173`

## 4. Testing the Application

1. Open your browser and navigate to `http://localhost:5173`
2. Click the **Single Sign-On** button
3. You'll be redirected to Microsoft login
4. Sign in with your Microsoft account
5. Grant the requested permissions
6. You'll be redirected back to the dashboard
7. You should see your profile information
8. Try sending a test email using the form

## Architecture Overview

### Backend (`apps/backend/src/auth/microsoft/`)

- **microsoft.controller.ts**: Handles OAuth flow and API endpoints
  - `GET /auth/microsoft/login` - Initiates OAuth flow
  - `GET /auth/microsoft/callback` - Handles OAuth callback
  - `GET /auth/microsoft/profile` - Gets user profile (protected)
  - `POST /auth/microsoft/send-email` - Sends email (protected)
  - `POST /auth/microsoft/refresh` - Refreshes access token (protected)
  - `POST /auth/microsoft/logout` - Logs out user (protected)

- **microsoft.service.ts**: Business logic for Microsoft Graph operations
  - Token exchange
  - Token refresh
  - User profile fetching
  - Email sending

- **session.store.ts**: Secure session management
  - PKCE parameter storage per user
  - User session management
  - Access token storage
  - Auto-cleanup of expired sessions

- **jwt.strategy.ts**: JWT authentication strategy
- **jwt-auth.guard.ts**: Route protection guard
- **dto/**: Data transfer objects for validation

### Frontend (`apps/frontend/src/`)

- **lib/auth.ts**: Authentication service
  - Token management with sessionStorage
  - User profile caching
  - Token refresh
  - Logout

- **lib/api.ts**: API helper functions
  - Authenticated requests
  - Email sending

- **pages/LoginPage.tsx**: Login page with Microsoft SSO
- **pages/AuthCallbackPage.tsx**: Handles OAuth callback
- **pages/DashboardPage.tsx**: Main dashboard with profile and email form

## Security Features

1. **PKCE Flow**: Each OAuth flow has unique code verifier/challenge
2. **Session Management**: Tokens stored per-session, not globally
3. **JWT Authentication**: Secure token-based auth with expiration
4. **Token Refresh**: Automatic token refresh capability
5. **Input Validation**: Backend validates all email inputs
6. **CORS Protection**: Only frontend origin allowed
7. **Session Cleanup**: Auto-removal of expired sessions

## Production Deployment

For production deployment:

1. Change `JWT_SECRET` to a strong random string
2. Update redirect URIs in Azure to your production URLs
3. Update environment variables with production URLs
4. Consider using Redis instead of in-memory session store
5. Enable HTTPS for all endpoints
6. Set proper CORS origins
7. Add rate limiting
8. Set up monitoring and logging

## Troubleshooting

### "Invalid OAuth state" error
- The OAuth session may have expired (10-minute timeout)
- Clear browser cookies and try again

### "Failed to fetch user profile"
- Check that all required permissions are granted in Azure
- Verify the access token is valid

### "Failed to send email"
- Ensure `Mail.Send` permission is granted and consented
- Verify the user has a valid mailbox
- Check recipient email addresses are valid

### CORS errors
- Verify `FRONTEND_URL` in backend `.env` matches your frontend URL
- Check browser console for specific CORS errors

## Next Steps

- Implement calendar management features
- Add email templates
- Integrate with other Microsoft Graph APIs
- Add user settings and preferences
- Implement real-time notifications
