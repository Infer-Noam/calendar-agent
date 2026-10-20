import { firestore } from "../../firestore.js";
import { BUDGET_SPEND_COLLECTION } from "../const/budget.const.js";
import type { MonthlyBudgetSpend } from "../type/budget.type.js";

const EMPTY_SPEND: MonthlyBudgetSpend = { totalCostUsd: 0, warningLogged: false };

const monthDoc = (monthKey: string) =>
  firestore.collection(BUDGET_SPEND_COLLECTION).doc(monthKey);

export const getMonthlySpend = async (monthKey: string): Promise<MonthlyBudgetSpend> => {
  const doc = await monthDoc(monthKey).get();
  return doc.exists ? (doc.data() as MonthlyBudgetSpend) : EMPTY_SPEND;
};

export const recordSpendAndGetStatus = (
  monthKey: string,
  costUsd: number,
  warningThresholdUsd: number
): Promise<{ totalCostUsd: number; justCrossedWarningThreshold: boolean }> => {
  const docRef = monthDoc(monthKey);

  return firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    const existing = doc.exists ? (doc.data() as MonthlyBudgetSpend) : EMPTY_SPEND;

    const totalCostUsd = existing.totalCostUsd + costUsd;
    const justCrossedWarningThreshold =
      totalCostUsd >= warningThresholdUsd && !existing.warningLogged;

    transaction.set(docRef, {
      totalCostUsd,
      warningLogged: existing.warningLogged || justCrossedWarningThreshold,
    });

    return { totalCostUsd, justCrossedWarningThreshold };
  });
};
