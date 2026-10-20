import type { GoogleCalendarClient } from "@shared/calendar/calendar.type.js";

export type EvalContext = {
  telegramUserId: string;
  calendar: GoogleCalendarClient;
};

export type EvalResult = {
  name: string;
  passed: boolean;
  detail: string;
};

export type EvalCase = (ctx: EvalContext) => Promise<EvalResult>;
