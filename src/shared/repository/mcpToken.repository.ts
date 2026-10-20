import { randomBytes } from "crypto";
import { firestore } from "../firestore.js";
import { MCP_TOKENS_COLLECTION } from "../mcpAuth/mcpAuth.const.js";

export const createMcpToken = async (telegramUserId: string): Promise<string> => {
  const token = randomBytes(32).toString("hex");

  await firestore
    .collection(MCP_TOKENS_COLLECTION)
    .doc(token)
    .set({ telegramUserId, createdAt: Date.now() });

  return token;
};

export const getTelegramUserIdForMcpToken = async (
  token: string
): Promise<string | undefined> => {
  const doc = await firestore.collection(MCP_TOKENS_COLLECTION).doc(token).get();
  return doc.exists ? (doc.data() as { telegramUserId: string }).telegramUserId : undefined;
};
