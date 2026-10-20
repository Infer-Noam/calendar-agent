import type { Request, Response } from "express";
import {
  getMcpConnectUrl,
  handleMcpOAuthCallback,
  McpIdentityNotFoundError,
} from "@core/mcpAuth/mcpAuth.service.js";
import {
  MCP_CONNECTION_CANCELLED_PAGE,
  MCP_MISSING_CODE_PAGE,
  MCP_IDENTITY_NOT_FOUND_PAGE,
  MCP_CONNECT_FAILED_PAGE,
  mcpTokenPage,
} from "./const/message.const.js";

const getQueryParam = (query: Request["query"], key: string): string | undefined =>
  typeof query[key] === "string" ? query[key] : undefined;

export const redirectToMcpConnect = (_req: Request, res: Response): void => {
  res.redirect(getMcpConnectUrl());
};

export const handleMcpCallback = async (
  req: Request,
  res: Response,
  notifyTelegramUser: (telegramUserId: string) => Promise<void>
): Promise<void> => {
  const code = getQueryParam(req.query, "code");
  const error = getQueryParam(req.query, "error");

  if (error) {
    res.send(MCP_CONNECTION_CANCELLED_PAGE);
    return;
  }

  if (!code) {
    res.status(400).send(MCP_MISSING_CODE_PAGE);
    return;
  }

  try {
    const { token, telegramUserId } = await handleMcpOAuthCallback(code);

    await notifyTelegramUser(telegramUserId);

    res.send(mcpTokenPage(token));
  } catch (err) {
    console.error("MCP OAuth callback failed:", err);

    if (err instanceof McpIdentityNotFoundError) {
      res.status(403).send(MCP_IDENTITY_NOT_FOUND_PAGE);
      return;
    }

    res.status(500).send(MCP_CONNECT_FAILED_PAGE);
  }
};
