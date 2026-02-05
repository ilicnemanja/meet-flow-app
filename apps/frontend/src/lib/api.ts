import { authService } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = authService.getToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  // Handle token expiration
  if (response.status === 401) {
    authService.clearToken();
    window.location.href = '/';
    throw new Error('Token expired');
  }

  return response;
}

// Send email via Microsoft Graph API
export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailRequest {
  to: EmailRecipient[];
  subject: string;
  body: string;
  contentType?: 'Text' | 'HTML';
}

export async function sendEmail(emailData: SendEmailRequest): Promise<void> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/auth/microsoft/send-email`,
    {
      method: 'POST',
      body: JSON.stringify(emailData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send email');
  }
}

// Calendar Event Types
export interface CalendarEvent {
  id: string;
  subject: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  body?: string;
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: Array<{
    name: string;
    email: string;
    status: string;
  }>;
  isAllDay: boolean;
  isCancelled: boolean;
}

export interface CreateEventRequest {
  subject: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  body?: string;
  attendees?: Array<{
    email: string;
    name?: string;
  }>;
  timeZone?: string;
}

// Get calendar events
export async function getCalendarEvents(
  startDate?: string,
  endDate?: string
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const url = `${API_BASE_URL}/auth/microsoft/calendar/events${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch calendar events');
  }

  const data = await response.json();
  return data.events;
}

// Create calendar event
export async function createCalendarEvent(
  eventData: CreateEventRequest
): Promise<CalendarEvent> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/auth/microsoft/calendar/events`,
    {
      method: 'POST',
      body: JSON.stringify(eventData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create calendar event');
  }

  const data = await response.json();
  return data.event;
}

// Delete calendar event
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/auth/microsoft/calendar/events/${eventId}`,
    {
      method: 'POST',
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete calendar event');
  }
}

// Email Message Types
export interface EmailMessageRecipient {
  name?: string;
  email: string;
}

export interface EmailMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  from: EmailMessageRecipient;
  toRecipients: EmailMessageRecipient[];
  receivedDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
  importance: string;
  conversationId?: string;
}

export interface EmailMessageDetail {
  id: string;
  subject: string;
  body: {
    contentType: string;
    content: string;
  };
  from: EmailMessageRecipient;
  toRecipients: EmailMessageRecipient[];
  ccRecipients?: EmailMessageRecipient[];
  bccRecipients?: EmailMessageRecipient[];
  receivedDateTime: string;
  sentDateTime?: string;
  isRead: boolean;
  hasAttachments: boolean;
  importance: string;
  conversationId?: string;
}

export interface InboxResponse {
  messages: EmailMessage[];
  totalCount: number;
}

// Get inbox messages
export async function getInboxMessages(
  top: number = 50,
  skip: number = 0
): Promise<InboxResponse> {
  const params = new URLSearchParams({
    top: top.toString(),
    skip: skip.toString(),
  });

  const url = `${API_BASE_URL}/auth/microsoft/mail/inbox?${params.toString()}`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch inbox messages');
  }

  return await response.json();
}

// Get single message
export async function getMessage(messageId: string): Promise<EmailMessageDetail> {
  const url = `${API_BASE_URL}/auth/microsoft/mail/message/${messageId}?messageId=${messageId}`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch message');
  }

  return await response.json();
}

// Mark message as read/unread
export async function markMessageAsRead(messageId: string, isRead: boolean): Promise<void> {
  const url = `${API_BASE_URL}/auth/microsoft/mail/message/${messageId}/read?messageId=${messageId}`;
  const response = await fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify({ isRead }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update message');
  }
}
