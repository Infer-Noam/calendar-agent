import type { Context } from "grammy";
import type { CalendarAccess } from "@shared/calendar/calendar.type.js";

export type BotContext = Context & {
  telegramUserId: string;
  calendarAccess: CalendarAccess;
};
