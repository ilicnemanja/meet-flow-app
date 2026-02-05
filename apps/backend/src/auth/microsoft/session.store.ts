import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

interface OAuthSession {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
  createdAt: number;
}

interface UserSession {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateCodeVerifier(): string {
  return base64UrlEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64UrlEncode(hash);
}

function generateState(): string {
  return base64UrlEncode(crypto.randomBytes(16));
}

@Injectable()
export class SessionStore {
  private oauthSessions = new Map<string, OAuthSession>();
  private userSessions = new Map<string, UserSession>();

  // Clean up expired sessions every 10 minutes
  constructor() {
    setInterval(() => this.cleanupExpiredSessions(), 10 * 60 * 1000);
  }

  // Create new OAuth session for login flow
  createOAuthSession(): { state: string; codeChallenge: string } {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    this.oauthSessions.set(state, {
      codeVerifier,
      codeChallenge,
      state,
      createdAt: Date.now(),
    });

    // Auto-cleanup after 10 minutes
    setTimeout(() => this.oauthSessions.delete(state), 10 * 60 * 1000);

    return { state, codeChallenge };
  }

  // Verify and consume OAuth session
  consumeOAuthSession(state: string): string | null {
    const session = this.oauthSessions.get(state);
    if (!session) {
      return null;
    }

    // Check if session is expired (10 minutes)
    if (Date.now() - session.createdAt > 10 * 60 * 1000) {
      this.oauthSessions.delete(state);
      return null;
    }

    const codeVerifier = session.codeVerifier;
    this.oauthSessions.delete(state);
    return codeVerifier;
  }

  // Store user session
  createUserSession(
    sessionId: string,
    userId: string,
    accessToken: string,
    expiresIn: number,
    refreshToken?: string,
  ): void {
    this.userSessions.set(sessionId, {
      userId,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
    });
  }

  // Get user session
  getUserSession(sessionId: string): UserSession | null {
    const session = this.userSessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if expired
    if (Date.now() >= session.expiresAt) {
      this.userSessions.delete(sessionId);
      return null;
    }

    return session;
  }

  // Update access token for session
  updateAccessToken(sessionId: string, accessToken: string, expiresIn: number): void {
    const session = this.userSessions.get(sessionId);
    if (session) {
      session.accessToken = accessToken;
      session.expiresAt = Date.now() + expiresIn * 1000;
    }
  }

  // Get user session by user ID (needed for webhooks)
  getUserSessionByUserId(userId: string): { sessionId: string; session: UserSession } | null {
    for (const [sessionId, session] of this.userSessions.entries()) {
      if (session.userId === userId) {
        // Check if expired
        if (Date.now() >= session.expiresAt) {
          this.userSessions.delete(sessionId);
          return null;
        }
        return { sessionId, session };
      }
    }
    return null;
  }

  // Delete user session (logout)
  deleteUserSession(sessionId: string): void {
    this.userSessions.delete(sessionId);
  }

  // Cleanup expired sessions
  private cleanupExpiredSessions(): void {
    const now = Date.now();

    // Cleanup OAuth sessions
    for (const [state, session] of this.oauthSessions.entries()) {
      if (now - session.createdAt > 10 * 60 * 1000) {
        this.oauthSessions.delete(state);
      }
    }

    // Cleanup user sessions
    for (const [sessionId, session] of this.userSessions.entries()) {
      if (now >= session.expiresAt) {
        this.userSessions.delete(sessionId);
      }
    }
  }
}
