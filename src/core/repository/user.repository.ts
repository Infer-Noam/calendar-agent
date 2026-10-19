import type { WriteBatch } from "@google-cloud/firestore";
import { CALENDAR_USERS_COLLECTION } from "../calendar/calendar.const.js";
import { firestore } from "../firestore.js";

export const getUserEmail = async (telegramUserId: string): Promise<string | undefined> => {
  const doc = await firestore.collection(CALENDAR_USERS_COLLECTION).doc(telegramUserId).get();
  return doc.exists ? (doc.data() as { email: string }).email : undefined;
};

export const queueSaveUserEmail = (batch: WriteBatch, telegramUserId: string, email: string) =>
  batch.set(firestore.collection(CALENDAR_USERS_COLLECTION).doc(telegramUserId), { email });

export const queueDeleteUserEmail = (batch: WriteBatch, telegramUserId: string) =>
  batch.delete(firestore.collection(CALENDAR_USERS_COLLECTION).doc(telegramUserId));
