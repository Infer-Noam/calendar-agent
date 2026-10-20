import {
  MONTHLY_LLM_BUDGET_CAP_USD,
  BUDGET_WARNING_THRESHOLD_RATIO,
  HAIKU_INPUT_PRICE_PER_MILLION_TOKENS_USD,
  HAIKU_OUTPUT_PRICE_PER_MILLION_TOKENS_USD,
} from "../const/budget.const.js";
import {
  getMonthlySpend,
  recordSpendAndGetStatus,
} from "../repository/budget.repository.js";
import { formatMonth } from "../../util/dateTime.util.js";

const currentMonthKey = (): string => formatMonth(new Date());

export const isBudgetExceeded = async (): Promise<boolean> => {
  const { totalCostUsd } = await getMonthlySpend(currentMonthKey());
  
  return totalCostUsd >= MONTHLY_LLM_BUDGET_CAP_USD;
};

export const recordLlmSpend = async (
  inputTokens: number,
  outputTokens: number
): Promise<void> => {
  const costUsd =
    (inputTokens * HAIKU_INPUT_PRICE_PER_MILLION_TOKENS_USD) / 1_000_000 +
    (outputTokens * HAIKU_OUTPUT_PRICE_PER_MILLION_TOKENS_USD) / 1_000_000;

  const { totalCostUsd, justCrossedWarningThreshold } = await recordSpendAndGetStatus(
    currentMonthKey(),
    costUsd,
    MONTHLY_LLM_BUDGET_CAP_USD * BUDGET_WARNING_THRESHOLD_RATIO
  );

  if (justCrossedWarningThreshold) {
    console.warn(
      `Budget warning: monthly LLM spend reached $${totalCostUsd.toFixed(4)}, ${(BUDGET_WARNING_THRESHOLD_RATIO * 100).toFixed(0)}% of the $${MONTHLY_LLM_BUDGET_CAP_USD} cap`
    );
  }
};
