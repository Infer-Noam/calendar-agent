import { google } from "googleapis";
import { CALENDAR_SCOPES } from "@core/calendar/calendar.const.js";
import { firestore } from "@core/firestore.js";
import { createOAuthClient } from "@core/oauth/oauth.client.js";
import { queueSaveTokens } from "@core/repository/token.repository.js";
import { queueSaveUserEmail } from "@core/repository/user.repository.js";

export const getAuthUrl = (telegramUserId: string): string =>
  createOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: CALENDAR_SCOPES,
    state: telegramUserId,
  });

export const handleOAuthCallback = async (code: string, telegramUserId: string): Promise<string> => {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error("Missing refresh_token in Google OAuth token response");
  }

  client.setCredentials(tokens);

  const { data } = await google.oauth2({ version: "v2", auth: client }).userinfo.get();

  if (!data.email) {
    throw new Error("Missing email in Google userinfo response");
  }

  const batch = firestore.batch();

  queueSaveTokens(batch, telegramUserId, tokens);
  queueSaveUserEmail(batch, telegramUserId, data.email);

  await batch.commit();

  return data.email;
};
