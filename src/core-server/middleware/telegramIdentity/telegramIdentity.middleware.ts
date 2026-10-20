import type { NextFunction } from "grammy";
import type { BotContext } from "./botContext.type.js";

export const telegramIdentityMiddleware = async (ctx: BotContext, next: NextFunction) => {
  if (!ctx.from) return;

  ctx.telegramUserId = String(ctx.from.id);
  await next();
};
