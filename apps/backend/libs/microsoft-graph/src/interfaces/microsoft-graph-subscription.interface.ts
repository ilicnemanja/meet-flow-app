export interface CreateSubscriptionRequest {
  changeType: string;
  notificationUrl: string;
  resource: string;
  expirationDateTime: string;
  clientState: string;
}

export interface CreateSubscriptionResponse {
  '@odata.context': string;
  id: string;
  resource: string;
  applicationId: string;
  changeType: string;
  clientState: string;
  notificationUrl: string;
  expirationDateTime: string;
  creatorId: string;
  latestSupportedTlsVersion: string;
  notificationContentType: string;
}

export interface SubscribeToChangeResult {
  subscription: CreateSubscriptionResponse;
  clientState: string;
}

export interface WebhookNotificationPayload {
  value: WebhookNotificationItem[];
}

export interface WebhookNotificationItem {
  subscriptionId: string;
  changeType: string;
  resource: string;
  clientState: string;
  resourceData?: {
    '@odata.type': string;
    '@odata.id': string;
    '@odata.etag': string;
    id: string;
  };
  tenantId?: string;
}

export interface OutlookEventAttendeeResponse {
  emailAddress: {
    address: string;
    name: string;
  };
  status: {
    response:
      | 'accepted'
      | 'declined'
      | 'tentativelyAccepted'
      | 'none'
      | 'notResponded'
      | 'organizer';
    time: string;
  };
  type: string;
}

export interface OutlookEventWithAttendees {
  id: string;
  subject: string;
  attendees: OutlookEventAttendeeResponse[];
}
