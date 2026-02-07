export interface CreateSubscriptionRequest {
  changeType: string;
  notificationUrl: string;
  resource: string;
  expirationDateTime: string;
  clientState: string;
  latestSupportedTlsVersion: string | null;
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
