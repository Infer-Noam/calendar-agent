import type { CalendarEvent, GoogleCalendarClient, GoogleCalendarEvent } from "./calendar.type.js";

const toCalendarEvent = (event: GoogleCalendarEvent): CalendarEvent | undefined => {
  const allDay = Boolean(event.start?.date);
  const start = event.start?.dateTime ?? event.start?.date;
  const end = event.end?.dateTime ?? event.end?.date;

  if (!event.id || !start || !end) return undefined;

  return {
    id: event.id,
    summary: event.summary ?? "(No title)",
    start: new Date(start),
    end: new Date(end),
    location: event.location ?? undefined,
    allDay,
  };
};

export const listEvents = async (
  calendar: GoogleCalendarClient,
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> => {
  const { data } = await calendar.events.list({
    calendarId: "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  return (data.items ?? [])
    .map(toCalendarEvent)
    .filter((event): event is CalendarEvent => event !== undefined);
};

export const getTodayEvents = (calendar: GoogleCalendarClient): Promise<CalendarEvent[]> => {
  const now = new Date();

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  
  return listEvents(calendar, startOfDay, endOfDay);
};
