import { google } from "googleapis";
import { createOAuthClient } from "../oauth/oauth.client.js";
import { getTelegramUserIdByEmail } from "../repository/user.repository.js";
import { createMcpToken } from "../repository/mcpToken.repository.js";
import { MCP_OAUTH_STATE, MCP_IDENTITY_SCOPES } from "./mcpAuth.const.js";

export class McpIdentityNotFoundError extends Error {}

export const getMcpConnectUrl = (): string =>
  createOAuthClient().generateAuthUrl({
    scope: MCP_IDENTITY_SCOPES,
    state: MCP_OAUTH_STATE,
  });

export const handleMcpOAuthCallback = async (
  code: string
): Promise<{ token: string; telegramUserId: string }> => {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);

  client.setCredentials(tokens);

  const { data } = await google.oauth2({ version: "v2", auth: client }).userinfo.get();

  if (!data.email) {
    throw new Error("Missing email in Google userinfo response");
  }

  const telegramUserId = await getTelegramUserIdByEmail(data.email);

  if (!telegramUserId) {
    throw new McpIdentityNotFoundError(data.email);
  }

  const token = await createMcpToken(telegramUserId);

  return { token, telegramUserId };
};
