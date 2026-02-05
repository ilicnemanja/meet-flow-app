interface AuthTokens {
  accessToken: string;
  expiresAt: number;
}

interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhones?: string[];
  photoUrl?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class AuthService {
  private static instance: AuthService;
  private tokens: AuthTokens | null = null;
  private userProfile: UserProfile | null = null;

  private constructor() {
    // Private constructor for singleton pattern
    this.loadTokenFromStorage();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Store token in sessionStorage (survives page refresh)
  setToken(token: string): void {
    const expiresAt = this.getTokenExpiration(token);

    this.tokens = {
      accessToken: token,
      expiresAt,
    };

    // Persist to sessionStorage
    sessionStorage.setItem('auth_token', token);
  }

  // Load token from sessionStorage on initialization
  private loadTokenFromStorage(): void {
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      const expiresAt = this.getTokenExpiration(token);
      // Only load if not expired
      if (Date.now() < expiresAt) {
        this.tokens = {
          accessToken: token,
          expiresAt,
        };
      } else {
        sessionStorage.removeItem('auth_token');
      }
    }
  }

  // Retrieve the current token
  getToken(): string | null {
    if (!this.tokens) return null;

    // Check if token is expired
    if (Date.now() >= this.tokens.expiresAt) {
      this.clearToken();
      return null;
    }

    return this.tokens.accessToken;
  }

  // Clear token from memory and storage
  clearToken(): void {
    this.tokens = null;
    this.userProfile = null;
    sessionStorage.removeItem('auth_token');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  // Get user profile (fetch if not cached)
  async getUserProfile(): Promise<UserProfile | null> {
    if (this.userProfile) {
      return this.userProfile;
    }

    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/microsoft/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
        }
        throw new Error('Failed to fetch user profile');
      }

      this.userProfile = await response.json();
      return this.userProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  // Refresh access token
  async refreshToken(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/microsoft/refresh`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        this.clearToken();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.clearToken();
      return false;
    }
  }

  // Logout user
  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/microsoft/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }
    this.clearToken();
  }

  // Extract expiration time from JWT token
  private getTokenExpiration(token: string): number {
    try {
      // Decode JWT payload
      const payload = JSON.parse(atob(token.split('.')[1]));
      return (payload.exp || 0) * 1000; // Convert to milliseconds
    } catch {
      // If parsing fails, set expiration to 7 days from now
      return Date.now() + 7 * 24 * 3600000;
    }
  }
}

export const authService = AuthService.getInstance();
export type { UserProfile };
