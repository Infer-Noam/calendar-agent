import "dotenv/config";
import { Bot } from "grammy";
import { getAuthUrl } from "./service/connect.service.js";
import { removeStoredTokens } from "@core/calendar/access.service.js";
import { CalendarAccessStatus } from "@core/calendar/calendar.type.js";
import { getTodayEvents } from "@core/calendar/calendarEvents.service.js";
import { startOAuthServer } from "./oauth.server.js";
import { telegramIdentityMiddleware } from "./middleware/telegramIdentity/telegramIdentity.middleware.js";
import { calendarAccessMiddleware } from "./middleware/calendarAccess.middleware.js";
import type { BotContext } from "./middleware/telegramIdentity/botContext.type.js";
import { BotCommand } from "./enum/botCommand.enum.js";
import {
  NOT_CONNECTED_MESSAGE,
  ALREADY_CONNECTED_MESSAGE,
  CALENDAR_EXPIRED_MESSAGE,
  DISCONNECTED_MESSAGE,
  DISCONNECT_NOT_CONNECTED_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  connectUrlMessage,
  connectedEmailMessage,
} from "./const/message.const.js";
import { formatEventsList } from "./util/calendarEvent.util.js";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

const bot = new Bot<BotContext>(token);

bot.use(telegramIdentityMiddleware);

bot.command(BotCommand.Connect, calendarAccessMiddleware, async (ctx) => {
  if (ctx.calendarAccess.status === CalendarAccessStatus.Connected) {
    await ctx.reply(ALREADY_CONNECTED_MESSAGE);
    return;
  }
  const url = getAuthUrl(ctx.telegramUserId);
  await ctx.reply(connectUrlMessage(url));
});

bot.command(BotCommand.Status, calendarAccessMiddleware, async (ctx) => {
  const access = ctx.calendarAccess;
  if (access.status === CalendarAccessStatus.Connected) {
    await ctx.reply(connectedEmailMessage(access.email));
  } else if (access.status === CalendarAccessStatus.Expired) {
    await ctx.reply(CALENDAR_EXPIRED_MESSAGE);
  } else {
    await ctx.reply(NOT_CONNECTED_MESSAGE);
  }
});

bot.command(BotCommand.Today, calendarAccessMiddleware, async (ctx) => {
  const access = ctx.calendarAccess;
  if (access.status !== CalendarAccessStatus.Connected) {
    await ctx.reply(NOT_CONNECTED_MESSAGE);
    return;
  }

  const events = await getTodayEvents(access.calendar);
  await ctx.reply(formatEventsList(events));
});

bot.command(BotCommand.Disconnect, async (ctx) => {
  const removed = await removeStoredTokens(ctx.telegramUserId);
  await ctx.reply(removed ? DISCONNECTED_MESSAGE : DISCONNECT_NOT_CONNECTED_MESSAGE);
});

bot.on("message:text", async (ctx) => {
  await ctx.reply(`I can't answer questions yet. Try /${BotCommand.Connect} to get started.`);
});

bot.catch((err) => {
  console.error(`Unhandled error for update ${err.ctx.update.update_id}:`, err.error);
  err.ctx
    .reply(GENERIC_ERROR_MESSAGE)
    .catch((replyErr) => console.error("Failed to notify user of error:", replyErr));
});

startOAuthServer(bot, 3000);

bot.start({
  onStart: (botInfo) => {
    console.log(`Telegram bot started (long polling) as @${botInfo.username}`);
  },
});
