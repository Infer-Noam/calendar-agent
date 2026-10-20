import type { Request, Response } from "express";
import type { Bot } from "grammy";
import { handleOAuthCallback } from "../service/connect.service.js";
import type { BotContext } from "../middleware/telegramIdentity/botContext.type.js";
import { getQueryParam } from "../util/query.util.js";
import {
  CONNECTION_CANCELLED_MESSAGE,
  CONNECTION_CANCELLED_PAGE,
  CONNECTED_PAGE,
  MISSING_CODE_OR_STATE_PAGE,
  CONNECT_FAILED_MESSAGE,
  CONNECT_FAILED_PAGE,
  oauthConnectedMessage,
} from "../const/message.const.js";

export const handleTelegramCallback = async (
  req: Request,
  res: Response,
  bot: Bot<BotContext>
): Promise<void> => {
  const code = getQueryParam(req.query, "code");
  const telegramUserId = getQueryParam(req.query, "state");
  const error = getQueryParam(req.query, "error");

  if (error && telegramUserId) {
    await bot.api
      .sendMessage(telegramUserId, CONNECTION_CANCELLED_MESSAGE)
      .catch((sendErr) => console.error("Failed to notify user of OAuth cancellation:", sendErr));
    res.send(CONNECTION_CANCELLED_PAGE);
    return;
  }

  if (!code || !telegramUserId) {
    res.status(400).send(MISSING_CODE_OR_STATE_PAGE);
    return;
  }

  try {
    const email = await handleOAuthCallback(code, telegramUserId);

    await bot.api.sendMessage(telegramUserId, oauthConnectedMessage(email));

    res.send(CONNECTED_PAGE);
  } catch (err) {
    console.error("OAuth callback failed:", err);
    await bot.api
      .sendMessage(telegramUserId, CONNECT_FAILED_MESSAGE)
      .catch((sendErr) => console.error("Failed to notify user of OAuth failure:", sendErr));

    res.status(500).send(CONNECT_FAILED_PAGE);
  }
};
