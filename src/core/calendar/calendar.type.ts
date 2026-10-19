import type { google } from "googleapis";

export enum CalendarAccessStatus {
  NotConnected = "not_connected",
  Expired = "expired",
  Connected = "connected",
}

export type CalendarAccess =
  | { status: CalendarAccessStatus.NotConnected }
  | { status: CalendarAccessStatus.Expired }
  | { status: CalendarAccessStatus.Connected; calendar: ReturnType<typeof google.calendar>; email: string };
