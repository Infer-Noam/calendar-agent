import type { CalendarEvent } from "@shared/calendar/calendar.type.js";
import { APP_TIMEZONE } from "@shared/util/dateTime.util.js";

const formatTime = (date: Date): string =>
  date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  });

export const formatEventsList = (events: CalendarEvent[]): string => {
  if (!events.length) return "No events today.";
  
  return events
    .map((event) =>
      event.allDay
        ? `All day: ${event.summary}`
        : `${formatTime(event.start)}-${formatTime(event.end)} ${event.summary}`
    )
    .join("\n");
};
