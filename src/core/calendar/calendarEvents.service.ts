import type {
  CalendarEvent,
  GoogleCalendarClient,
  GoogleCalendarEvent,
} from "./calendar.type.js";
import { startOfToday } from "../util/dateTime.util.js";
import { toExclusiveEndDate } from "../util/calendar.util.js";

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
    description: event.description ?? undefined,
    reminderMinutesBefore: event.reminders?.overrides?.[0]?.minutes ?? undefined,
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

export type EventWriteFields = {
  summary: string;
  allDay: boolean;
  start: string;
  end: string;
  description?: string;
  reminderMinutesBefore?: number;
};

const buildEventRequestBody = ({
  summary,
  allDay,
  start,
  end,
  description,
  reminderMinutesBefore,
}: EventWriteFields) => ({
  summary,
  start: allDay ? { date: start } : { dateTime: start },
  end: allDay ? { date: toExclusiveEndDate(end) } : { dateTime: end },
  ...(description !== undefined ? { description } : {}),
  ...(reminderMinutesBefore !== undefined
    ? {
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: reminderMinutesBefore }],
        },
      }
    : {}),
});

export const createEvent = async (
  calendar: GoogleCalendarClient,
  fields: EventWriteFields
) =>
  calendar.events.insert({
    calendarId: "primary",
    requestBody: buildEventRequestBody(fields),
  });

export const updateEvent = async (
  calendar: GoogleCalendarClient,
  eventId: string,
  fields: EventWriteFields
) =>
  calendar.events.update({
    calendarId: "primary",
    eventId,
    requestBody: buildEventRequestBody(fields),
  });

export const deleteEvent = async (
  calendar: GoogleCalendarClient,
  eventId: string
) =>
  calendar.events.delete({
    calendarId: "primary",
    eventId,
  });

