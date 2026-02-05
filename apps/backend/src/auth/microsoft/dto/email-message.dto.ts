export class EmailRecipientDto {
  name?: string;
  email: string;
}

export class EmailMessageDto {
  id: string;
  subject: string;
  bodyPreview: string;
  from: EmailRecipientDto;
  toRecipients: EmailRecipientDto[];
  receivedDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
  importance: string;
  conversationId?: string;
}

export class EmailMessageDetailDto {
  id: string;
  subject: string;
  body: {
    contentType: string;
    content: string;
  };
  from: EmailRecipientDto;
  toRecipients: EmailRecipientDto[];
  ccRecipients?: EmailRecipientDto[];
  bccRecipients?: EmailRecipientDto[];
  receivedDateTime: string;
  sentDateTime?: string;
  isRead: boolean;
  hasAttachments: boolean;
  importance: string;
  conversationId?: string;
}
