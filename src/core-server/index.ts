import express from "express";
import { webhookCallback } from "grammy";
import { bot } from "./telegramBot.js";
import { createOAuthRouter } from "./route/oauth.route.js";
import { createDailyScanRouter } from "./route/dailyScan.route.js";
import { createNotifyProposalRouter } from "./route/notifyProposal.route.js";
import { WEBHOOK_PATH, DEFAULT_PORT } from "./const/server.const.js";

const {
  DAILY_SCAN_SECRET,
  NOTIFY_PROPOSAL_SECRET,
  PORT = DEFAULT_PORT,
  WEBHOOK_URL,
} = process.env;

if (!DAILY_SCAN_SECRET) {
  throw new Error("DAILY_SCAN_SECRET is not set");
}

if (!NOTIFY_PROPOSAL_SECRET) {
  throw new Error("NOTIFY_PROPOSAL_SECRET is not set");
}

const app = express();

app.use(createOAuthRouter(bot));
app.use(createDailyScanRouter(bot, DAILY_SCAN_SECRET));
app.use(createNotifyProposalRouter(bot, NOTIFY_PROPOSAL_SECRET));

if (WEBHOOK_URL) {
  const webhookEndpoint = new URL(WEBHOOK_PATH, WEBHOOK_URL).toString();

  app.use(express.json());
  app.use(WEBHOOK_PATH, webhookCallback(bot, "express"));

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (webhook mode)`);
  });

  await bot.api.setWebhook(webhookEndpoint);
  console.log(`Telegram webhook set to ${webhookEndpoint}`);
} else {
  app.listen(PORT, () => {
    console.log(`OAuth callback server listening on port ${PORT}`);
  });

  bot.start({
    onStart: (botInfo) => {
      console.log(
        `Telegram bot started (long polling) as @${botInfo.username}`
      );
    },
  });
}
