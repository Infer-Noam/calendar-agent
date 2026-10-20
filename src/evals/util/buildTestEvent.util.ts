import type { CalendarEvent } from "@shared/calendar/calendar.type.js";

export const buildTestEvent = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
  id: "eval-event",
  summary: "Eval event",
  start: new Date(),
  end: new Date(),
  allDay: false,
  ...overrides,
});
