import type { NextFunction } from "grammy";
import type { BotContext } from "./telegramIdentity/botContext.type.js";
import { getCalendarAccessForUser } from "@shared/calendar/access.service.js";

export const calendarAccessMiddleware = async (ctx: BotContext, next: NextFunction) => {
  ctx.calendarAccess = await getCalendarAccessForUser(ctx.telegramUserId);
  await next();
};
