export class CreateSubscriptionData {
  organizerEmail: string;
  subscriptionId: string;
  clientState: string;
  microsoftHomeAccountId: string;
  expiresAt: Date;
  lastRenewedAt?: Date;
}

export class UpdateSubscriptionData {
  subscriptionId?: string;
  expiresAt?: Date;
  lastRenewedAt?: Date;
}
