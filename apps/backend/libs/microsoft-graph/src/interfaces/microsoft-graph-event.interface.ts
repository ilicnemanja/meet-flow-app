export interface OutlookDateTimeZone {
  dateTime: string;
  timeZone: string;
}

export interface OutlookAttendee {
  email: string;
  name: string;
}

export interface CreateOutlookEventDto {
  subject: string;
  body?: string;
  start: OutlookDateTimeZone;
  end: OutlookDateTimeZone;
  attendees?: OutlookAttendee[];
  isOnlineMeeting: boolean;
}

export interface OutlookEventResponse {
  id: string;
  subject: string;
  webLink: string;
  onlineMeeting?: {
    joinUrl: string;
  };
}
