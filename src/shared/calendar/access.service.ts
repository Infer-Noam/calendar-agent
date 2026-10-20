import { google } from "googleapis";
import { GaxiosError } from "gaxios";
import { createOAuthClient } from "../oauth/oauth.client.js";
import { firestore } from "../firestore.js";
import {
  getStoredTokens,
  saveTokens,
  queueDeleteTokens,
} from "../repository/token.repository.js";
import { getUserEmail, queueDeleteUserEmail } from "../repository/user.repository.js";
import { CalendarAccessStatus, type CalendarAccess } from "./calendar.type.js";

export const getCalendarAccessForUser = async (
  telegramUserId: string
): Promise<CalendarAccess> => {
  const tokens = await getStoredTokens(telegramUserId);

  if (!tokens) return { status: CalendarAccessStatus.NotConnected };

  const client = createOAuthClient();

  client.setCredentials(tokens);

  client.on("tokens", (refreshed) =>
    saveTokens(telegramUserId, { ...tokens, ...refreshed }).catch((err) => {
      console.error("Failed to persist refreshed tokens:", err);
    })
  );

  try {
    await client.getAccessToken();
  } catch (err) {
    if (
      err instanceof GaxiosError &&
      err.response?.data?.error === "invalid_grant"
    ) {
      const cleanupBatch = firestore.batch();

      queueDeleteTokens(cleanupBatch, telegramUserId);
      queueDeleteUserEmail(cleanupBatch, telegramUserId);
      
      await cleanupBatch.commit().catch((cleanupErr) => {
        console.error("Failed to clean up expired tokens:", cleanupErr);
      });

      return { status: CalendarAccessStatus.Expired };
    }
    throw err;
  }

  return {
    status: CalendarAccessStatus.Connected,
    calendar: google.calendar({ version: "v3", auth: client }),
    email: (await getUserEmail(telegramUserId)) ?? "unknown",
  };
};

export const removeStoredTokens = async (
  telegramUserId: string
): Promise<boolean> => {
  const tokens = await getStoredTokens(telegramUserId);

  if (!tokens) return false;

  const client = createOAuthClient();

  client.setCredentials(tokens);

  await client.revokeCredentials().catch((err) => {
    console.error(
      "Failed to revoke Google token (removing stored copy anyway):",
      err
    );
  });

  const batch = firestore.batch();
  queueDeleteTokens(batch, telegramUserId);
  queueDeleteUserEmail(batch, telegramUserId);
  await batch.commit();

  return true;
};
