// DTO for Microsoft Graph webhook validation
export class WebhookValidationDto {
  validationToken: string;
}

// DTO for notification item from Microsoft Graph
export class NotificationItemDto {
  changeType: 'created' | 'updated' | 'deleted';
  clientState: string;
  resource: string; // e.g., "Users/{userId}/Events/{eventId}"
  resourceData: {
    '@odata.type': string;
    '@odata.id': string;
    '@odata.etag': string;
    id: string;
  };
  subscriptionExpirationDateTime: string;
  subscriptionId: string;
  tenantId: string;
}

// DTO for webhook notification payload
export class WebhookNotificationDto {
  value: NotificationItemDto[];
}

// DTO for creating a subscription
export class CreateSubscriptionDto {
  changeType: string;
  notificationUrl: string;
  resource: string;
  expirationDateTime: string;
  clientState: string;
}

// DTO for subscription response from Microsoft Graph
export class SubscriptionResponseDto {
  id: string;
  resource: string;
  applicationId: string;
  changeType: string;
  clientState: string;
  notificationUrl: string;
  expirationDateTime: string;
  creatorId: string;
  latestSupportedTlsVersion: string;
  encryptionCertificate?: string;
  encryptionCertificateId?: string;
  includeResourceData?: boolean;
  lifecycleNotificationUrl?: string;
  notificationContentType?: string;
}
