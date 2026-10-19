import type { Credentials } from "google-auth-library";
import type { WriteBatch } from "@google-cloud/firestore";
import { CALENDAR_TOKENS_COLLECTION } from "../calendar/calendar.const.js";
import { firestore } from "../firestore.js";

export const getStoredTokens = async (
  telegramUserId: string
): Promise<Credentials | undefined> => {
  const doc = await firestore
    .collection(CALENDAR_TOKENS_COLLECTION)
    .doc(telegramUserId)
    .get();
  return doc.exists ? (doc.data()) : undefined;
};

export const saveTokens = async (telegramUserId: string, tokens: Credentials) =>
  firestore.collection(CALENDAR_TOKENS_COLLECTION).doc(telegramUserId).set(tokens);

export const queueSaveTokens = (batch: WriteBatch, telegramUserId: string, tokens: Credentials) =>
  batch.set(firestore.collection(CALENDAR_TOKENS_COLLECTION).doc(telegramUserId), tokens);

export const queueDeleteTokens = (batch: WriteBatch, telegramUserId: string) =>
  batch.delete(firestore.collection(CALENDAR_TOKENS_COLLECTION).doc(telegramUserId));
