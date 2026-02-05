export class CalendarEventDto {
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

export class CalendarEventsResponseDto {
  events: CalendarEventDto[];
}
