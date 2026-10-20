import "dotenv/config";
import express from "express";
import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { getAuthUrl } from "./service/connect.service.js";
import { removeStoredTokens } from "@core/calendar/access.service.js";
import { CalendarAccessStatus } from "@core/calendar/calendar.type.js";
import { getTodayEvents } from "@core/calendar/calendarEvents.service.js";
import { answerCalendarQuestion } from "@core/llm/service/calendarAssistant.service.js";
import { getProposal } from "@core/repository/eventProposal.repository.js";
import { buildOAuthApp } from "./oauth.server.js";
import { WEBHOOK_PATH, DEFAULT_PORT } from "./const/server.const.js";
import { telegramIdentityMiddleware } from "./middleware/telegramIdentity/telegramIdentity.middleware.js";
import { calendarAccessMiddleware } from "./middleware/calendarAccess.middleware.js";
import { handleProposalApproval } from "./service/proposalApproval.service.js";
import type { BotContext } from "./middleware/telegramIdentity/botContext.type.js";
import { BotCommand } from "./enum/botCommand.enum.js";
import { ProposalAction } from "./enum/proposalAction.enum.js";
import { buildProposalCallbackData } from "./util/proposalCallback.util.js";
import {
  NOT_CONNECTED_MESSAGE,
  ALREADY_CONNECTED_MESSAGE,
  CALENDAR_EXPIRED_MESSAGE,
  DISCONNECTED_MESSAGE,
  DISCONNECT_NOT_CONNECTED_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  AI_UNAVAILABLE_MESSAGE,
  connectUrlMessage,
  connectedEmailMessage,
} from "./const/message.const.js";
import { formatEventsList } from "./util/calendarEvent.util.js";
import { formatProposalConfirmation } from "./util/eventProposal.util.js";

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
  await ctx.reply(
    removed ? DISCONNECTED_MESSAGE : DISCONNECT_NOT_CONNECTED_MESSAGE
  );
});

bot.on("message:text", calendarAccessMiddleware, async (ctx) => {
  const access = ctx.calendarAccess;
  if (access.status !== CalendarAccessStatus.Connected) {
    await ctx.reply(NOT_CONNECTED_MESSAGE);
    return;
  }

  const result = await answerCalendarQuestion(
    ctx.telegramUserId,
    ctx.message.text,
    access.calendar
  ).catch((err) => {
    console.error("LLM call failed:", err);
    return null;
  });

  if (!result) {
    await ctx.reply(AI_UNAVAILABLE_MESSAGE);
    return;
  }

  await ctx.reply(result.answer);

  const proposalIds = result.toolCalls.reduce<string[]>(
    (ids, call) => (call.proposalId ? [...ids, call.proposalId] : ids),
    []
  );

  await Promise.all(
    proposalIds.map(async (proposalId) => {
      const proposal = await getProposal(proposalId);

      if (!proposal) return;

      const keyboard = new InlineKeyboard()
        .text("Approve", buildProposalCallbackData(ProposalAction.Approve, proposalId))
        .text("Reject", buildProposalCallbackData(ProposalAction.Reject, proposalId));

      await ctx.reply(formatProposalConfirmation(proposal), { reply_markup: keyboard });
    })
  );
});

bot.callbackQuery(/^(approve|reject):/, handleProposalApproval);

bot.catch((err) => {
  console.error(
    `Unhandled error for update ${err.ctx.update.update_id}:`,
    err.error
  );
  err.ctx
    .reply(GENERIC_ERROR_MESSAGE)
    .catch((replyErr) =>
      console.error("Failed to notify user of error:", replyErr)
    );
});

const port = Number(process.env.PORT) || DEFAULT_PORT;
const webhookUrl = process.env.WEBHOOK_URL;

const app = buildOAuthApp(bot);

if (webhookUrl) {
  const webhookEndpoint = new URL(WEBHOOK_PATH, webhookUrl).toString();

  app.use(express.json());
  app.use(WEBHOOK_PATH, webhookCallback(bot, "express"));
  
  app.listen(port, () => {
    console.log(`Server listening on port ${port} (webhook mode)`);
  });

  await bot.api.setWebhook(webhookEndpoint);
  console.log(`Telegram webhook set to ${webhookEndpoint}`);
} else {
  app.listen(port, () => {
    console.log(`OAuth callback server listening on port ${port}`);
  });

  bot.start({
    onStart: (botInfo) => {
      console.log(`Telegram bot started (long polling) as @${botInfo.username}`);
    },
  });
}
