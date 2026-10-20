import { listEvents } from "../../calendar/calendarEvents.service.js";
import type { CalendarEvent } from "../../calendar/calendar.type.js";
import {
  formatTime,
  formatDate,
  parseLocalDate,
} from "../../util/dateTime.util.js";
import type { ToolDefinition } from "../type/tool.type.js";
import { ListEventsInputSchema } from "../validation/listEvents.validation.js";

const formatEventForPrompt = (event: CalendarEvent): string => {
  const startDate = formatDate(event.start);

  if (event.allDay) return `[id=${event.id}] ${startDate} All day: ${event.summary}`;

  const endDate = formatDate(event.end);
  const timeRange =
    startDate === endDate
      ? `${formatTime(event.start)}-${formatTime(event.end)}`
      : `${formatTime(event.start)} (${startDate}) - ${formatTime(event.end)} (${endDate})`;

  return `[id=${event.id}] ${startDate} ${timeRange} ${event.summary}`;
};

export const LIST_EVENTS_TOOL: ToolDefinition = {
  schema: {
    name: "list_events",
    description:
      "Fetch real calendar events from the inclusive start date through the inclusive end date. Call this whenever you need to see events for a specific period to answer the question. Each event is returned with its real eventId, needed if you want to edit or delete it.",
    input_schema: {
      type: "object",
      properties: {
        start: {
          type: "string",
          description: "Inclusive start date, ISO 8601 format, e.g. 2026-10-20",
        },
        end: {
          type: "string",
          description: "Inclusive end date, ISO 8601 format, e.g. 2026-10-27",
        },
      },
      required: ["start", "end"],
    },
  },
  run: async ({ calendar }, input) => {
    const parsed = ListEventsInputSchema.safeParse(input);
    if (!parsed.success)
      return { content: `Error: invalid input for tool "list_events"` };

    const timeMin = parseLocalDate(parsed.data.start);
    const timeMax = parseLocalDate(parsed.data.end);
    timeMax.setDate(timeMax.getDate() + 1);

    const events = await listEvents(calendar, timeMin, timeMax);

    return {
      content: Boolean(events.length)
        ? events.map(formatEventForPrompt).join("\n")
        : "(no events in this range)",
    };
  },
};
