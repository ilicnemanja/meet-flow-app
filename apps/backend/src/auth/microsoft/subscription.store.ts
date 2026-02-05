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

function generateClientState(): string {
  return crypto.randomBytes(16).toString('hex');
}

@Injectable()
export class SubscriptionStore {
  private subscriptions = new Map<string, GraphSubscription>();
  private userToSubscription = new Map<string, string>(); // userId -> subscriptionId

  // Clean up expired subscriptions every 10 minutes
  constructor() {
    setInterval(() => this.cleanupExpiredSubscriptions(), 10 * 60 * 1000);
  }

  // Create new subscription entry
  createSubscription(
    subscriptionId: string,
    userId: string,
    resourcePath: string,
    expirationDateTime: Date,
    clientState?: string,
  ): string {
    const state = clientState || generateClientState();

    // Delete old subscription for this user if exists
    const existingSubscriptionId = this.userToSubscription.get(userId);
    if (existingSubscriptionId) {
      this.deleteSubscription(existingSubscriptionId);
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

  // Get subscription by ID
  getSubscription(subscriptionId: string): GraphSubscription | null {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return null;
    }

    // Check if expired
    if (new Date() >= subscription.expirationDateTime) {
      this.deleteSubscription(subscriptionId);
      return null;
    }

    return subscription;
  }

  // Get subscription by user ID
  getSubscriptionByUserId(userId: string): GraphSubscription | null {
    const subscriptionId = this.userToSubscription.get(userId);
    if (!subscriptionId) {
      return null;
    }

    return this.getSubscription(subscriptionId);
  }

  // Update subscription expiration (for renewals)
  updateExpiration(
    subscriptionId: string,
    expirationDateTime: Date,
  ): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.expirationDateTime = expirationDateTime;

      // Clear old renewal timeout
      if (subscription.renewalTimeoutId) {
        clearTimeout(subscription.renewalTimeoutId);
        subscription.renewalTimeoutId = undefined;
      }
    }
  }

  // Store renewal timeout ID
  setRenewalTimeout(
    subscriptionId: string,
    timeoutId: NodeJS.Timeout,
  ): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      // Clear old timeout if exists
      if (subscription.renewalTimeoutId) {
        clearTimeout(subscription.renewalTimeoutId);
      }
      subscription.renewalTimeoutId = timeoutId;
    }
  }

  // Delete subscription
  deleteSubscription(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      // Clear renewal timeout
      if (subscription.renewalTimeoutId) {
        clearTimeout(subscription.renewalTimeoutId);
      }

      // Remove from both maps
      this.userToSubscription.delete(subscription.userId);
      this.subscriptions.delete(subscriptionId);
    }
  }

  // Delete subscription by user ID
  deleteSubscriptionByUserId(userId: string): void {
    const subscriptionId = this.userToSubscription.get(userId);
    if (subscriptionId) {
      this.deleteSubscription(subscriptionId);
    }
  }

  // Get all subscriptions (for debugging/monitoring)
  getAllSubscriptions(): GraphSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  // Cleanup expired subscriptions
  private cleanupExpiredSubscriptions(): void {
    const now = new Date();

    for (const [subscriptionId, subscription] of this.subscriptions.entries()) {
      if (now >= subscription.expirationDateTime) {
        console.log(`[SubscriptionStore] Cleaning up expired subscription: ${subscriptionId}`);
        this.deleteSubscription(subscriptionId);
      }
    }
  }
}
