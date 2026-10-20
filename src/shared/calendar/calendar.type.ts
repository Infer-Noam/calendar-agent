import type { google, calendar_v3 } from "googleapis";

export type GoogleCalendarClient = ReturnType<typeof google.calendar>;

export type GoogleCalendarEvent = calendar_v3.Schema$Event;

export enum CalendarAccessStatus {
  NotConnected = "not_connected",
  Expired = "expired",
  Connected = "connected",
}

export type CalendarAccess =
  | { status: CalendarAccessStatus.NotConnected }
  | { status: CalendarAccessStatus.Expired }
  | { status: CalendarAccessStatus.Connected; calendar: GoogleCalendarClient; email: string };

export type CalendarEvent = {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  reminderMinutesBefore?: number;
  allDay: boolean;
};
