import express from "express";
import type { Bot } from "grammy";
import { handleOAuthCallback } from "./service/connect.service.js";
import type { BotContext } from "./middleware/telegramIdentity/botContext.type.js";
import { BotCommand } from "./enum/botCommand.enum.js";
import { getQueryParam } from "./util/query.util.js";

export const startOAuthServer = (bot: Bot<BotContext>, port: number) => {
  const app = express();

  app.get("/oauth/callback", async (req, res) => {
    const code = getQueryParam(req.query, "code");
    const telegramUserId = getQueryParam(req.query, "state");
    const error = getQueryParam(req.query, "error");

    if (error && telegramUserId) {
      await bot.api
        .sendMessage(telegramUserId, `Calendar connection cancelled. Send /${BotCommand.Connect} if you change your mind.`)
        .catch((sendErr) => console.error("Failed to notify user of OAuth cancellation:", sendErr));
      res.send("Calendar connection cancelled. You can close this tab and go back to Telegram.");
      return;
    }

    if (!code || !telegramUserId) {
      res.status(400).send("Missing code or state");
      return;
    }

    try {
      const email = await handleOAuthCallback(code, telegramUserId);
      
      await bot.api.sendMessage(
        telegramUserId,
        `Calendar connected: ${email}\nNot you? Send /${BotCommand.Disconnect} then /${BotCommand.Connect} again.`
      );

      res.send("Calendar connected. You can close this tab and go back to Telegram.");
    } catch (err) {
      console.error("OAuth callback failed:", err);
      await bot.api
        .sendMessage(telegramUserId, `Connecting your calendar failed. Send /${BotCommand.Connect} to try again.`)
        .catch((sendErr) => console.error("Failed to notify user of OAuth failure:", sendErr));

      res.status(500).send(`Something went wrong connecting your calendar. You can close this tab and try /${BotCommand.Connect} again in Telegram.`);
    }
  });

  app.listen(port, () => {
    console.log(`OAuth callback server listening on port ${port}`);
  });
};
