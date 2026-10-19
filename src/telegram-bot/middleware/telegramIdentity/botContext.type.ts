import type { Context } from "grammy";
import type { CalendarAccess } from "@core/calendar/calendar.type.js";

export type BotContext = Context & {
  telegramUserId: string;
  calendarAccess?: CalendarAccess;
};
