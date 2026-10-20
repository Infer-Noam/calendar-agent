import type { CalendarEvent } from "../../calendar/calendar.type.js";
import { formatTime, formatDate } from "../../util/dateTime.util.js";

const formatEventDetails = (event: CalendarEvent): string => {
  const details: string[] = [];

  if (event.description) details.push(`description="${event.description}"`);

  if (event.reminderMinutesBefore !== undefined)
    details.push(`reminderMinutesBefore=${event.reminderMinutesBefore}`);

  return Boolean(details.length) ? ` (${details.join(", ")})` : "";
};

export const formatEventForPrompt = (event: CalendarEvent): string => {
  const startDate = formatDate(event.start);
  const details = formatEventDetails(event);

  if (event.allDay)
    return `[id=${event.id}] ${startDate} All day: ${event.summary}${details}`;

  const endDate = formatDate(event.end);
  const timeRange =
    startDate === endDate
      ? `${formatTime(event.start)}-${formatTime(event.end)}`
      : `${formatTime(event.start)} (${startDate}) - ${formatTime(
          event.end
        )} (${endDate})`;

  return `[id=${event.id}] ${startDate} ${timeRange} ${event.summary}${details}`;
};
