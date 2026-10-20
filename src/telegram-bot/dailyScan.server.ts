import { timingSafeEqual } from "crypto";
import type { Express } from "express";
import type { Bot } from "grammy";
import type { BotContext } from "./middleware/telegramIdentity/botContext.type.js";
import { runDailyScanForAllUsers } from "./service/dailyScanBroadcast.service.js";
import { DAILY_SCAN_PATH, DAILY_SCAN_SECRET_HEADER } from "./const/server.const.js";

const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

export const mountDailyScanRoute = (
  app: Express,
  bot: Bot<BotContext>,
  secret: string
): void => {
  app.post(DAILY_SCAN_PATH, async (req, res) => {
    const provided = req.get(DAILY_SCAN_SECRET_HEADER);

    if (!provided || !safeEqual(provided, secret)) {
      res.status(401).send("Unauthorized");
      return;
    }

    try {
      const sentCount = await runDailyScanForAllUsers(bot);
      res.json({ sent: sentCount });
    } catch (err) {
      console.error("Daily scan route failed:", err);
      res.status(500).send("Daily scan failed");
    }
  });
};
