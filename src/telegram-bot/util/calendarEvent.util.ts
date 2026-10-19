import type { CalendarEvent } from "@core/calendar/calendar.type.js";

const formatTime = (date: Date): string =>
  date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

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
