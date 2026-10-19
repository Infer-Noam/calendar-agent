import type {
  CalendarEvent,
  GoogleCalendarClient,
  GoogleCalendarEvent,
} from "./calendar.type.js";
import { startOfToday } from "../util/date.util.js";

const toCalendarEvent = (
  event: GoogleCalendarEvent
): CalendarEvent | undefined => {
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

  return (data.items ?? []).reduce<CalendarEvent[]>((events, item) => {
    const event = toCalendarEvent(item);
    if (event) events.push(event);

    return events;
  }, []);
};

export const getTodayEvents = (
  calendar: GoogleCalendarClient
): Promise<CalendarEvent[]> =>
  listEvents(calendar, startOfToday(), startOfToday(1));
