import express from "express";
import type { Bot } from "grammy";
import { MCP_OAUTH_STATE } from "@shared/mcpAuth/mcpAuth.const.js";
import {
  handleMcpCallback,
  redirectToMcpConnect,
} from "../handler/mcpConnect.handler.js";
import { handleTelegramCallback } from "../handler/telegramConnect.handler.js";
import type { BotContext } from "../middleware/telegramIdentity/botContext.type.js";
import { getQueryParam } from "../util/query.util.js";
import { MCP_TOKEN_ISSUED_MESSAGE } from "../const/message.const.js";

export const createOAuthRouter = (bot: Bot<BotContext>) => {
  const router = express.Router();

  router.get("/mcp/connect", redirectToMcpConnect);

  router.get("/oauth/callback", async (req, res) => {
    const state = getQueryParam(req.query, "state");

    if (state === MCP_OAUTH_STATE) {
      await handleMcpCallback(req, res, async (telegramUserId) => {
        await bot.api
          .sendMessage(telegramUserId, MCP_TOKEN_ISSUED_MESSAGE)
          .catch((sendErr) =>
            console.error("Failed to notify user of MCP connect:", sendErr)
          );
      });
      return;
    }

    await handleTelegramCallback(req, res, bot);
  });

  return router;
};