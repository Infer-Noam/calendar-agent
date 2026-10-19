import { firestore } from "../firestore.js";
import {
  CONVERSATION_HISTORY_COLLECTION,
  MAX_HISTORY_TURNS,
  HISTORY_EXPIRY_MS,
} from "../llm/const/conversationHistory.const.js";
import type {
  ConversationTurn,
  StoredHistory,
} from "../llm/type/conversationHistory.type.js";

export const getRecentTurns = async (
  telegramUserId: string
): Promise<ConversationTurn[]> => {
  const doc = await firestore
    .collection(CONVERSATION_HISTORY_COLLECTION)
    .doc(telegramUserId)
    .get();
  if (!doc.exists) return [];

  const data = doc.data() as StoredHistory;
  const isExpired = Date.now() - data.updatedAt > HISTORY_EXPIRY_MS;
  return isExpired ? [] : data.turns;
};

export const appendTurn = async (
  telegramUserId: string,
  turn: ConversationTurn
): Promise<void> => {
  const docRef = firestore.collection(CONVERSATION_HISTORY_COLLECTION).doc(telegramUserId);

  await firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    const data = doc.exists ? (doc.data() as StoredHistory) : null;
    const isExpired = Boolean(data) && Date.now() - data!.updatedAt > HISTORY_EXPIRY_MS;
    const existing = !Boolean(data) || isExpired ? [] : data!.turns;

    const turns = [...existing, turn].slice(-MAX_HISTORY_TURNS);
    transaction.set(docRef, { turns, updatedAt: Date.now() });
  });
};
