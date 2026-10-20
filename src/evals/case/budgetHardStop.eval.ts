import { answerCalendarQuestion } from "@shared/llm/service/calendarAssistant.service.js";
import { BUDGET_PAUSED_MESSAGE } from "@shared/llm/const/calendarAssistant.const.js";
import { BUDGET_SPEND_COLLECTION, MONTHLY_LLM_BUDGET_CAP_USD } from "@shared/budget/const/budget.const.js";
import { firestore } from "@shared/firestore.js";
import { formatMonth } from "@shared/util/dateTime.util.js";
import type { EvalCase } from "../type/eval.type.js";

export const evalBudgetHardStop: EvalCase = async ({ telegramUserId, calendar }) => {
  const name = "budget: hard stop returns the paused message instead of calling the LLM once over the cap";

  const monthKey = formatMonth(new Date());
  const docRef = firestore.collection(BUDGET_SPEND_COLLECTION).doc(monthKey);
  const existing = await docRef.get();
  const existingData = existing.exists ? existing.data() : null;

  await docRef.set({ totalCostUsd: MONTHLY_LLM_BUDGET_CAP_USD + 1, warningLogged: true });

  const result = await answerCalendarQuestion(telegramUserId, "What's on my calendar today?", calendar);

  if (existingData) await docRef.set(existingData);
  else await docRef.delete();

  return {
    name,
    passed: result.answer === BUDGET_PAUSED_MESSAGE,
    detail: `answer: ${result.answer}`,
  };
};
